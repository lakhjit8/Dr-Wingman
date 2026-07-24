import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import {
  deleteScreenshots,
  downloadScreenshotAsBase64,
  getUserFromRequest,
  supabaseAdmin,
} from '../_shared/supabaseAdmin.ts'
import { callDrWingman } from '../_shared/claude.ts'
import { matchAnalysisInstructions } from '../_shared/modeInstructions.ts'
import { shouldSimulateFailure } from '../_shared/testMode.ts'

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const user = await getUserFromRequest(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  let paths: string[] = []
  try {
    const body = await req.json()
    paths = Array.isArray(body.paths) ? body.paths : []
    const platform: string | undefined = body.platform
    const matchId: string | undefined = body.matchId

    if (!paths.length) {
      return new Response(JSON.stringify({ error: 'No screenshots provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    if (paths.some((p) => !p.startsWith(`${user.id}/`))) {
      return new Response(JSON.stringify({ error: 'Invalid screenshot path' }), {
        status: 403,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const images = await Promise.all(paths.map(downloadScreenshotAsBase64))

    if (shouldSimulateFailure(req)) {
      throw new Error('Simulated Claude API failure (test mode)')
    }

    const { json } = await callDrWingman({
      modeInstructions: matchAnalysisInstructions(platform),
      images,
    })

    if (!json) {
      throw new Error('Dr. Wingman did not return a parseable match analysis')
    }

    // Label date reflects when the match was first added, not re-analyzed —
    // fetch the existing created_at on update so the label doesn't shift.
    let labelDate = new Date()
    if (matchId) {
      const { data: existing } = await supabaseAdmin
        .from('matches')
        .select('created_at')
        .eq('id', matchId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (existing?.created_at) labelDate = new Date(existing.created_at)
    }

    const traits = Array.isArray(json.label_traits) ? (json.label_traits as string[]) : []
    const matchLabel = formatMatchLabel(traits, labelDate)

    const record = {
      user_id: user.id,
      platform: platform ?? null,
      match_label: matchLabel,
      style_summary: json,
    }

    const { data: savedMatch, error: upsertError } = matchId
      ? await supabaseAdmin.from('matches').update(record).eq('id', matchId).eq('user_id', user.id).select().single()
      : await supabaseAdmin.from('matches').insert(record).select().single()

    if (upsertError) throw upsertError

    await supabaseAdmin.from('match_messages').insert({
      match_id: savedMatch.id,
      user_id: user.id,
      sender: 'coach',
      content: buildCoachSummary(json),
      metadata: json,
    })

    return new Response(JSON.stringify({ matchId: savedMatch.id, analysis: json }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } finally {
    await deleteScreenshots(paths)
  }
})

/**
 * Never the match's real name — two AI-generated, non-identifying style
 * traits plus the date the match was added, e.g. "Outdoorsy, direct
 * communicator (Jul 21)".
 */
function formatMatchLabel(traits: string[], date: Date): string {
  const clean = traits.filter((t) => typeof t === 'string' && t.trim()).slice(0, 2)
  const traitPart = clean.length ? clean.join(', ') : 'New match'
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${traitPart} (${datePart})`
}

function buildCoachSummary(analysis: Record<string, unknown>): string {
  const openingMessages = Array.isArray(analysis.opening_messages)
    ? (analysis.opening_messages as string[])
    : []
  const greenFlags = Array.isArray(analysis.green_flags) ? (analysis.green_flags as string[]) : []
  const redFlags = Array.isArray(analysis.red_flags) ? (analysis.red_flags as string[]) : []

  const blocks = [
    [`Pace: ${analysis.pace ?? 'unclear'}`, analysis.investment_read ? `Investment read: ${analysis.investment_read}` : '']
      .filter(Boolean)
      .join('\n'),
    String(analysis.compatibility_notes ?? ''),
    `Bridge strategy: ${analysis.bridge_strategy ?? ''}`,
  ]
  if (greenFlags.length || redFlags.length) {
    blocks.push(
      [
        greenFlags.length ? `Green flags: ${greenFlags.join(', ')}` : '',
        redFlags.length ? `Red flags: ${redFlags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }
  if (openingMessages.length) {
    blocks.push(
      ['A few opening messages to consider:', ...openingMessages.map((m, i) => `${i + 1}. ${m}`)].join('\n')
    )
  }
  return blocks.filter(Boolean).join('\n\n').trim()
}
