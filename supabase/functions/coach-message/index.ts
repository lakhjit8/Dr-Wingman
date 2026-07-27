import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import {
  deleteScreenshots,
  downloadScreenshotAsBase64,
  getUserFromRequest,
  supabaseAdmin,
} from '../_shared/supabaseAdmin.ts'
import { callDrWingman } from '../_shared/claude.ts'
import { checkBeforeCall } from '../_shared/spendingGuard.ts'
import { messageCoachingInstructions } from '../_shared/modeInstructions.ts'
import { shouldSimulateFailure } from '../_shared/testMode.ts'

interface ParsedMessage {
  sender: 'user' | 'match'
  text: string
}

interface StoredMessage {
  sender: 'user' | 'match' | 'coach'
  content: string
  created_at: string
}

// Once more than MAX_UNCOMPACTED messages sit un-summarized, fold all but
// the most recent KEEP_VERBATIM_TAIL into matches.conversation_summary.
// Between compaction events the verbatim block only grows by appending —
// a stable prefix, which is what makes the historyBlock cache breakpoint
// in callDrWingman actually pay off across a burst of back-and-forth.
const MAX_UNCOMPACTED = 24
const KEEP_VERBATIM_TAIL = 8

function formatTranscript(messages: StoredMessage[]): string {
  return messages.map((m) => `[${m.sender}] ${m.content}`).join('\n')
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

    const guard = await checkBeforeCall({
      userId: user.id,
      feature: 'message_coaching',
      textLength: userText?.length ?? 0,
      imageCount: paths.length,
    })
    if (!guard.allowed) {
      return new Response(JSON.stringify({ error: guard.reason }), {
        status: 429,
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

    // Fetches the whole thread (all senders) — used both to build the
    // compaction-aware history block below and as the dedup reference set
    // further down, so there's only one query for both instead of two.
    const { data: allMessages } = await supabaseAdmin
      .from('match_messages')
      .select('sender, content, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    const transcript = (allMessages ?? []) as StoredMessage[]
    const totalCount = transcript.length
    const summaryThroughCount = match.summary_through_count ?? 0
    const needsCompaction = totalCount - summaryThroughCount > MAX_UNCOMPACTED

    const newSummaryThroughCount = needsCompaction ? totalCount - KEEP_VERBATIM_TAIL : summaryThroughCount
    const gapMessages = needsCompaction ? transcript.slice(summaryThroughCount, newSummaryThroughCount) : []
    const recentMessages = transcript.slice(newSummaryThroughCount)
    const recentText = formatTranscript(recentMessages)

    const images = await Promise.all(paths.map(downloadScreenshotAsBase64))

    if (shouldSimulateFailure(req)) {
      throw new Error('Simulated Claude API failure (test mode)')
    }

    const historyBlock = [
      `Known pace for this match: ${match.style_summary?.pace ?? 'unknown'}.`,
      match.conversation_summary
        ? `Summary of the conversation before the messages below:\n${match.conversation_summary}`
        : '',
      recentText ? `Recent conversation and coaching history:\n${recentText}` : 'No prior conversation history.',
    ]
      .filter(Boolean)
      .join('\n\n')

    const { json, stopReason } = await callDrWingman({
      modeInstructions: messageCoachingInstructions(
        paths.length > 0,
        Boolean(userText),
        needsCompaction ? { gapMessagesText: formatTranscript(gapMessages) } : undefined
      ),
      historyBlock,
      images,
      userText,
      userId: user.id,
      feature: 'message_coaching',
    })

    if (!json) {
      throw new Error(`Dr. Wingman did not return a parseable coaching response (stop_reason: ${stopReason})`)
    }

    const matchUpdate: { last_message_at: string; conversation_summary?: string; summary_through_count?: number } = {
      last_message_at: new Date().toISOString(),
    }
    if (needsCompaction) {
      if (typeof json.updated_summary === 'string' && json.updated_summary.trim()) {
        matchUpdate.conversation_summary = json.updated_summary
        matchUpdate.summary_through_count = newSummaryThroughCount
      } else {
        console.error('Compaction was needed but model did not return updated_summary — will retry next call')
      }
    }

    const allParsedMessages = (Array.isArray(json.parsed_messages) ? json.parsed_messages : []) as ParsedMessage[]

    // A new screenshot's visible transcript naturally overlaps with
    // messages already parsed from a previous screenshot (that's just how
    // scrolled chat screenshots work) — the model is asked to extract only
    // new messages, but can't reliably judge "new" from pixels alone, so
    // this is the actual guarantee against re-inserting the same message
    // as a duplicate row every time. Checked against the full stored
    // history for this match (already fetched above), so duplicates
    // further back than the recent window still get caught.
    const seen = new Set(
      transcript.filter((m) => m.sender === 'user' || m.sender === 'match').map((m) => `${m.sender}::${m.content}`)
    )

    const parsedMessages = allParsedMessages.filter((m) => {
      if (!m?.text) return false
      const sender = m.sender === 'match' ? 'match' : 'user'
      const key = `${sender}::${m.text}`
      if (seen.has(key)) return false
      seen.add(key) // also dedupe repeats within this same batch
      return true
    })

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

    const { error: matchUpdateError } = await supabaseAdmin.from('matches').update(matchUpdate).eq('id', matchId)
    if (matchUpdateError) console.error('Failed to update match:', matchUpdateError.message)

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
