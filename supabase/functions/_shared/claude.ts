import { DR_WINGMAN_PERSONA } from './persona.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-5'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

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
 */
export async function callDrWingman(opts: {
  modeInstructions: string
  images?: ImageInput[]
  userText?: string
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

  const response = await fetch(ANTHROPIC_API_URL, {
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

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errBody}`)
  }

  const data = await response.json()
  const text: string = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')

  return { text, json: extractJsonBlock(text), stopReason: data.stop_reason }
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
