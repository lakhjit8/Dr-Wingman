import { supabaseAdmin } from './supabaseAdmin.ts'
import { CLAUDE_MODEL, type Feature } from './claude.ts'

// profile_builder (bio/vibe drafting) is the one non-critical feature that
// gets cut off at the soft-stop threshold; match_analysis and
// message_coaching are treated as core and only stop at the hard-stop tier.
const NON_CRITICAL_FEATURES: Feature[] = ['profile_builder']

export interface SpendingGuardResult {
  allowed: boolean
  reason?: string
}

/**
 * Checked before every Claude API call, in this order: request-size caps,
 * the latched hard-stop flag, a live monthly-spend check against the
 * hard-stop and soft-stop thresholds (latching hard-stop immediately on
 * crossing rather than waiting on the periodic alert job), then a per-user
 * rolling-hour request cap. Fails open (allows the call) if budget_config
 * is unreadable — a guardrail outage should not itself take the app down.
 */
export async function checkBeforeCall(input: {
  userId: string
  feature: Feature
  textLength: number
  imageCount: number
}): Promise<SpendingGuardResult> {
  const { data: config, error: configError } = await supabaseAdmin
    .from('budget_config')
    .select('*')
    .eq('id', true)
    .maybeSingle()

  if (configError || !config) {
    console.error('spendingGuard: could not load budget_config — failing open', configError?.message)
    return { allowed: true }
  }

  if (input.textLength > config.max_user_text_chars) {
    return { allowed: false, reason: `That message is too long (max ${config.max_user_text_chars} characters).` }
  }
  if (input.imageCount > config.max_images_per_request) {
    return { allowed: false, reason: `Too many photos in one request (max ${config.max_images_per_request}).` }
  }

  if (config.hard_stop_active) {
    await logRejection(input.userId, input.feature, 'rejected_over_limit')
    return { allowed: false, reason: 'Dr. Wingman is temporarily unavailable — usage limit reached. Please try again later.' }
  }

  const monthSpend = await getCurrentMonthSpend()

  if (monthSpend >= Number(config.hard_stop_threshold_usd)) {
    const { error: latchError } = await supabaseAdmin.from('budget_config').update({ hard_stop_active: true }).eq('id', true)
    if (latchError) console.error('spendingGuard: failed to latch hard_stop_active', latchError.message)
    await logRejection(input.userId, input.feature, 'rejected_over_limit')
    return { allowed: false, reason: 'Dr. Wingman is temporarily unavailable — usage limit reached. Please try again later.' }
  }

  if (monthSpend >= Number(config.soft_stop_threshold_usd) && NON_CRITICAL_FEATURES.includes(input.feature)) {
    await logRejection(input.userId, input.feature, 'rejected_over_limit')
    return { allowed: false, reason: 'This feature is temporarily unavailable — please try again later.' }
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabaseAdmin
    .from('api_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .gte('created_at', hourAgo)

  if (countError) {
    console.error('spendingGuard: failed to check per-user rate limit — failing open', countError.message)
    return { allowed: true }
  }
  if ((count ?? 0) >= config.per_user_hourly_request_limit) {
    await logRejection(input.userId, input.feature, 'rejected_rate_limit')
    return { allowed: false, reason: "You're doing that a lot — please try again in a bit." }
  }

  return { allowed: true }
}

export async function getCurrentMonthSpend(): Promise<number> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabaseAdmin
    .from('api_usage_log')
    .select('estimated_cost_usd')
    .gte('created_at', monthStart.toISOString())

  if (error) {
    console.error('spendingGuard: failed to compute month spend', error.message)
    return 0
  }
  return (data ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_usd), 0)
}

async function logRejection(
  userId: string,
  feature: Feature,
  status: 'rejected_over_limit' | 'rejected_rate_limit'
): Promise<void> {
  const { error } = await supabaseAdmin.from('api_usage_log').insert({
    user_id: userId,
    feature,
    model: CLAUDE_MODEL,
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_usd: 0,
    status,
  })
  if (error) console.error('spendingGuard: failed to log rejection', error.message)
}
