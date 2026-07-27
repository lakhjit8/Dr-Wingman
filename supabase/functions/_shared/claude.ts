import { DR_WINGMAN_PERSONA } from './persona.ts'
import { supabaseAdmin } from './supabaseAdmin.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
export const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-5'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export type Feature = 'profile_builder' | 'match_analysis' | 'message_coaching'

export interface ImageInput {
  base64: string
  mediaType: string
}

type CacheControl = { type: 'ephemeral'; ttl?: '1h' }

type ContentBlock =
  | { type: 'text'; text: string; cache_control?: CacheControl }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

/**
 * Calls Claude with the Dr. Wingman persona as the system prompt, plus
 * mode-specific instructions and any screenshots as image blocks. Expects
 * the model to end its reply with a fenced ```json block per the "APP-
 * SPECIFIC OUTPUT CONTRACT" in the persona doc, and parses it out.
 *
 * The persona (identical on every call, app-wide) is always cache_control
 * marked with a 1h TTL — cheap to add, benefits every call regardless of
 * mode or thread length. `historyBlock`, when provided, gets its own 1h
 * cache breakpoint too: callers that maintain an append-only-between-
 * compactions conversation history (see coach-message) get repeat-call
 * discounts on that growing block as long as it stays a stable prefix.
 * historyBlock is placed before images/task text since cache breakpoints
 * only cover content up to and including the marker.
 *
 * Every call is logged to api_usage_log — success or failure — per the
 * expense-tracking spec, since this is the single choke point all 3
 * analysis modes call through.
 */
export async function callDrWingman(opts: {
  modeInstructions: string
  historyBlock?: string
  images?: ImageInput[]
  userText?: string
  userId: string
  feature: Feature
}): Promise<{ text: string; json: Record<string, unknown> | null; stopReason: string | undefined }> {
  const content: ContentBlock[] = []

  if (opts.historyBlock) {
    content.push({
      type: 'text',
      text: opts.historyBlock,
      cache_control: { type: 'ephemeral', ttl: '1h' },
    })
  }

  for (const img of opts.images ?? []) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    })
  }

  const promptParts = [opts.modeInstructions]
  if (opts.userText) promptParts.push(`User message: ${opts.userText}`)
  content.push({ type: 'text', text: promptParts.join('\n\n') })

  let response: Response
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        // Persona v2's OUTPUT FORMAT is a full multi-section analysis (Client
        // Context, Psychological Profile, 3-5 ranked Response Options each
        // with sub-fields, What NOT to Say, Compatibility Assessment, etc.)
        // before the trailing JSON block — 4096 was cutting the response off
        // before it ever reached the JSON, causing every request to fail.
        max_tokens: 8192,
        system: [
          {
            type: 'text',
            text: DR_WINGMAN_PERSONA,
            cache_control: { type: 'ephemeral', ttl: '1h' },
          },
        ],
        messages: [{ role: 'user', content }],
      }),
    })
  } catch (err) {
    await logUsage({ userId: opts.userId, feature: opts.feature, status: 'error' })
    throw err
  }

  if (!response.ok) {
    const errBody = await response.text()
    await logUsage({ userId: opts.userId, feature: opts.feature, status: 'error' })
    throw new Error(`Claude API error ${response.status}: ${errBody}`)
  }

  const data = await response.json()
  const text: string = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')

  const usage = data.usage ?? {}
  await logUsage({
    userId: opts.userId,
    feature: opts.feature,
    status: 'success',
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheWrite5mTokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    cacheWrite1hTokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  })

  return { text, json: extractJsonBlock(text), stopReason: data.stop_reason }
}

/**
 * Logging must never break the actual feature — any failure here (missing
 * pricing row, transient DB error) is swallowed after a console.error, not
 * propagated to the caller.
 */
async function logUsage(opts: {
  userId: string
  feature: Feature
  status: 'success' | 'error'
  inputTokens?: number
  outputTokens?: number
  cacheWrite5mTokens?: number
  cacheWrite1hTokens?: number
  cacheReadTokens?: number
}): Promise<void> {
  try {
    const inputTokens = opts.inputTokens ?? 0
    const outputTokens = opts.outputTokens ?? 0
    const cacheWrite5mTokens = opts.cacheWrite5mTokens ?? 0
    const cacheWrite1hTokens = opts.cacheWrite1hTokens ?? 0
    const cacheReadTokens = opts.cacheReadTokens ?? 0
    let estimatedCostUsd = 0

    if (opts.status === 'success') {
      const { data: pricing } = await supabaseAdmin
        .from('model_pricing')
        .select(
          'input_price_per_million, output_price_per_million, cache_write_5m_price_per_million, cache_write_1h_price_per_million, cache_read_price_per_million'
        )
        .eq('model', CLAUDE_MODEL)
        .maybeSingle()
      if (pricing) {
        estimatedCostUsd =
          (inputTokens * Number(pricing.input_price_per_million) +
            outputTokens * Number(pricing.output_price_per_million) +
            cacheWrite5mTokens * Number(pricing.cache_write_5m_price_per_million ?? 0) +
            cacheWrite1hTokens * Number(pricing.cache_write_1h_price_per_million ?? 0) +
            cacheReadTokens * Number(pricing.cache_read_price_per_million ?? 0)) /
          1_000_000
      } else {
        console.error(`No model_pricing row for model "${CLAUDE_MODEL}" — logging cost as 0`)
      }
    }

    const { error } = await supabaseAdmin.from('api_usage_log').insert({
      user_id: opts.userId,
      feature: opts.feature,
      model: CLAUDE_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_write_tokens: cacheWrite5mTokens + cacheWrite1hTokens,
      cache_read_tokens: cacheReadTokens,
      estimated_cost_usd: estimatedCostUsd,
      status: opts.status,
    })
    if (error) console.error('Failed to log api_usage_log row:', error.message)
  } catch (err) {
    console.error('Unexpected error logging api_usage_log row:', err)
  }
}

function extractJsonBlock(text: string): Record<string, unknown> | null {
  const match = text.match(/```json\s*([\s\S]*?)```/i)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}
