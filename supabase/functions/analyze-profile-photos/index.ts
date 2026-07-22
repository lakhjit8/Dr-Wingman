import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import {
  deleteScreenshots,
  downloadScreenshotAsBase64,
  getUserFromRequest,
  supabaseAdmin,
} from '../_shared/supabaseAdmin.ts'
import { callDrWingman } from '../_shared/claude.ts'
import { profileBuilderInstructions } from '../_shared/modeInstructions.ts'

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
    const interviewNotes: string | undefined = body.interviewNotes

    if (!paths.length) {
      return new Response(JSON.stringify({ error: 'No photos provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    // Screenshot paths are user-scoped (`${userId}/...`); reject cross-user paths defensively.
    if (paths.some((p) => !p.startsWith(`${user.id}/`))) {
      return new Response(JSON.stringify({ error: 'Invalid photo path' }), {
        status: 403,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const images = await Promise.all(paths.map(downloadScreenshotAsBase64))

    const { json } = await callDrWingman({
      modeInstructions: profileBuilderInstructions(interviewNotes),
      images,
    })

    if (!json) {
      throw new Error('Dr. Wingman did not return a parseable profile analysis')
    }

    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          bio_draft: json.bio_draft ?? null,
          prompts: json.prompt_suggestions ?? [],
          photo_analysis: json,
          communication_style: json.communication_style ?? null,
        },
        { onConflict: 'id' }
      )

    if (upsertError) throw upsertError

    return new Response(JSON.stringify({ analysis: json }), {
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
