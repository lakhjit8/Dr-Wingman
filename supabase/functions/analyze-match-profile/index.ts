import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import {
  deleteScreenshots,
  downloadScreenshotAsBase64,
  getUserFromRequest,
  supabaseAdmin,
} from '../_shared/supabaseAdmin.ts'
import { callDrWingman } from '../_shared/claude.ts'
import { matchAnalysisInstructions } from '../_shared/modeInstructions.ts'

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

    const { json } = await callDrWingman({
      modeInstructions: matchAnalysisInstructions(platform),
      images,
    })

    if (!json) {
      throw new Error('Dr. Wingman did not return a parseable match analysis')
    }

    const matchName = typeof json.match_name === 'string' && json.match_name.trim() ? json.match_name : 'Match'

    const record = {
      user_id: user.id,
      platform: platform ?? null,
      match_name: matchName,
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

function buildCoachSummary(analysis: Record<string, unknown>): string {
  const lines = [
    `Communication style: ${analysis.communication_style ?? 'unclear'}`,
    '',
    String(analysis.compatibility_notes ?? ''),
    '',
    `Bridge strategy: ${analysis.bridge_strategy ?? ''}`,
  ]
  return lines.join('\n').trim()
}
