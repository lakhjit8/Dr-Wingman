import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import {
  deleteScreenshots,
  downloadScreenshotAsBase64,
  getUserFromRequest,
  supabaseAdmin,
} from '../_shared/supabaseAdmin.ts'
import { callDrWingman } from '../_shared/claude.ts'
import { messageCoachingInstructions } from '../_shared/modeInstructions.ts'
import { shouldSimulateFailure } from '../_shared/testMode.ts'

interface ParsedMessage {
  sender: 'user' | 'match'
  text: string
}

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
    const matchId: string | undefined = body.matchId
    paths = Array.isArray(body.paths) ? body.paths : []
    const userText: string | undefined = body.userText

    if (!matchId) {
      return new Response(JSON.stringify({ error: 'matchId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }
    if (!paths.length && !userText) {
      return new Response(JSON.stringify({ error: 'Provide a screenshot or a message' }), {
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

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (matchError) throw matchError
    if (!match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const { data: history } = await supabaseAdmin
      .from('match_messages')
      .select('sender, content')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .limit(50)

    const historyText = (history ?? [])
      .map((m) => `[${m.sender}] ${m.content}`)
      .join('\n')

    const images = await Promise.all(paths.map(downloadScreenshotAsBase64))

    if (shouldSimulateFailure(req)) {
      throw new Error('Simulated Claude API failure (test mode)')
    }

    const contextPrefix = [
      `Known pace for this match: ${match.style_summary?.pace ?? 'unknown'}.`,
      historyText ? `Conversation and coaching history so far:\n${historyText}` : 'No prior conversation history.',
    ].join('\n\n')

    const { json, stopReason } = await callDrWingman({
      modeInstructions: `${contextPrefix}\n\n${messageCoachingInstructions(paths.length > 0, Boolean(userText))}`,
      images,
      userText,
      userId: user.id,
      feature: 'message_coaching',
    })

    if (!json) {
      throw new Error(`Dr. Wingman did not return a parseable coaching response (stop_reason: ${stopReason})`)
    }

    const parsedMessages = (Array.isArray(json.parsed_messages) ? json.parsed_messages : []) as ParsedMessage[]

    const rowsToInsert: {
      match_id: string
      user_id: string
      sender: 'user' | 'match' | 'coach'
      content: string
      metadata: Record<string, unknown> | null
    }[] = []

    if (userText) {
      rowsToInsert.push({ match_id: matchId, user_id: user.id, sender: 'user', content: userText, metadata: null })
    }

    for (const m of parsedMessages) {
      if (!m?.text) continue
      rowsToInsert.push({
        match_id: matchId,
        user_id: user.id,
        sender: m.sender === 'match' ? 'match' : 'user',
        content: m.text,
        metadata: null,
      })
    }

    rowsToInsert.push({
      match_id: matchId,
      user_id: user.id,
      sender: 'coach',
      content: buildCoachReply(json),
      metadata: json,
    })

    const { error: insertError } = await supabaseAdmin.from('match_messages').insert(rowsToInsert)
    if (insertError) throw insertError

    await supabaseAdmin
      .from('matches')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', matchId)

    return new Response(JSON.stringify({ ok: true, analysis: json }), {
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

function buildCoachReply(analysis: Record<string, unknown>): string {
  const suggested = Array.isArray(analysis.suggested_replies) ? (analysis.suggested_replies as string[]) : []
  const lines = [
    String(analysis.reading ?? ''),
    '',
    String(analysis.translation ?? ''),
    '',
    suggested.length ? 'Try one of these:' : '',
    ...suggested.map((s, i) => `${i + 1}. ${s}`),
    '',
    String(analysis.momentum_note ?? ''),
  ]
  return lines.filter((l) => l !== '').join('\n')
}
