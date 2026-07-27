import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { getCurrentMonthSpend } from '../_shared/spendingGuard.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
// The Resend sandbox sender (onboarding@resend.dev, used until a domain is
// verified) can only send to the email address the Resend account itself
// is registered under — defaulting to ldvendingllc@gmail.com here would
// 403. Verify a domain in Resend to unlock sending to other addresses.
const ALERT_EMAIL_TO = Deno.env.get('ALERT_EMAIL_TO') ?? 'lakhjitsingh8@gmail.com'
const ALERT_EMAIL_FROM = Deno.env.get('ALERT_EMAIL_FROM') ?? 'onboarding@resend.dev'

type Tier = 'alert' | 'soft_stop' | 'hard_stop' | null

/**
 * Restricted to the service-role caller (the pg_cron job) — same pattern as
 * cleanup-stale-screenshots, since this reads/writes budget_config and
 * sends email regardless of any individual user's permissions.
 */
function isServiceRoleRequest(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const payloadSegment = token.split('.')[1]
  if (!payloadSegment) return false
  try {
    const json = atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json)
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

async function sendAlertEmail(subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — skipping alert email:', subject)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: ALERT_EMAIL_FROM, to: ALERT_EMAIL_TO, subject, text }),
  })
  if (!res.ok) console.error('Failed to send alert email:', res.status, await res.text())
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  if (!isServiceRoleRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  try {
    const { data: config, error: configError } = await supabaseAdmin
      .from('budget_config')
      .select('*')
      .eq('id', true)
      .maybeSingle()
    if (configError) throw configError
    if (!config) throw new Error('budget_config row missing')

    const monthSpend = await getCurrentMonthSpend()

    let tier: Tier = null
    if (config.hard_stop_active || monthSpend >= Number(config.hard_stop_threshold_usd)) tier = 'hard_stop'
    else if (monthSpend >= Number(config.soft_stop_threshold_usd)) tier = 'soft_stop'
    else if (monthSpend >= Number(config.alert_threshold_usd)) tier = 'alert'

    // Only emails on a tier *change* — re-running every 15 minutes at the
    // same tier doesn't re-send. tier naturally returns to null once a new
    // month's spend drops back under the alert threshold, which clears
    // last_alert_tier_sent so the next crossing alerts again.
    if (tier !== config.last_alert_tier_sent) {
      if (tier) {
        await sendAlertEmail(
          `Dr. Wingman budget alert: ${tier.replace('_', ' ')} threshold crossed`,
          [
            `Current month spend: $${monthSpend.toFixed(2)}`,
            `Tier: ${tier}`,
            `Hard-stop active: ${config.hard_stop_active}`,
            '',
            'Manage thresholds and the hard-stop toggle from the /admin dashboard.',
          ].join('\n')
        )
      }
      const { error: updateError } = await supabaseAdmin
        .from('budget_config')
        .update({ last_alert_tier_sent: tier, last_alert_sent_at: new Date().toISOString() })
        .eq('id', true)
      if (updateError) console.error('Failed to update last_alert_tier_sent:', updateError.message)
    }

    // Repeated per-user rate-limit hits — possible abuse or a client-side
    // loop bug, not just a heavy user, per the spec.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: rateLimitHits } = await supabaseAdmin
      .from('api_usage_log')
      .select('user_id')
      .eq('status', 'rejected_rate_limit')
      .gte('created_at', hourAgo)

    const hitCounts = new Map<string, number>()
    for (const row of rateLimitHits ?? []) {
      if (!row.user_id) continue
      hitCounts.set(row.user_id, (hitCounts.get(row.user_id) ?? 0) + 1)
    }
    const abusiveUsers = [...hitCounts.entries()].filter(([, count]) => count >= 3)

    const recentlyAlerted =
      config.last_abuse_alert_sent_at &&
      Date.now() - new Date(config.last_abuse_alert_sent_at).getTime() < 60 * 60 * 1000

    if (abusiveUsers.length && !recentlyAlerted) {
      await sendAlertEmail(
        'Dr. Wingman: repeated rate-limit hits detected',
        abusiveUsers
          .map(([userId, count]) => `User ${userId}: ${count} rejected requests in the last hour`)
          .join('\n')
      )
      const { error: abuseUpdateError } = await supabaseAdmin
        .from('budget_config')
        .update({ last_abuse_alert_sent_at: new Date().toISOString() })
        .eq('id', true)
      if (abuseUpdateError) console.error('Failed to update last_abuse_alert_sent_at:', abuseUpdateError.message)
    }

    return new Response(JSON.stringify({ ok: true, tier, monthSpend }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
