import { DR_WINGMAN_PERSONA } from './persona.ts'
import { supabaseAdmin } from './supabaseAdmin.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-5'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export type Feature = 'profile_builder' | 'match_analysis' | 'message_coaching'

export interface ImageInput {
  base64: string
  mediaType: string
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

/**
 * Calls Claude with the Dr. Wingman persona as the system prompt, plus
 * mode-specific instructions and any screenshots as image blocks. Expects
 * the model to end its reply with a fenced ```json block per the "APP-
 * SPECIFIC OUTPUT CONTRACT" in the persona doc, and parses it out.
 *
 * Every call is logged to api_usage_log — success or failure — per the
 * expense-tracking spec, since this is the single choke point all 3
 * analysis modes call through.
 */
export async function callDrWingman(opts: {
  modeInstructions: string
  images?: ImageInput[]
  userText?: string
  userId: string
  feature: Feature
}): Promise<{ text: string; json: Record<string, unknown> | null; stopReason: string | undefined }> {
  const content: ContentBlock[] = []

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
        system: DR_WINGMAN_PERSONA,
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

  await logUsage({
    userId: opts.userId,
    feature: opts.feature,
    status: 'success',
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
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
}): Promise<void> {
  try {
    const inputTokens = opts.inputTokens ?? 0
    const outputTokens = opts.outputTokens ?? 0
    let estimatedCostUsd = 0

    if (opts.status === 'success') {
      const { data: pricing } = await supabaseAdmin
        .from('model_pricing')
        .select('input_price_per_million, output_price_per_million')
        .eq('model', CLAUDE_MODEL)
        .maybeSingle()
      if (pricing) {
        estimatedCostUsd =
          (inputTokens * Number(pricing.input_price_per_million)) / 1_000_000 +
          (outputTokens * Number(pricing.output_price_per_million)) / 1_000_000
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
