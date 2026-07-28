export type CommunicationStyle = 'action-oriented' | 'emotional-relational' | 'balanced'

/** Match-analysis pacing tier (persona v2's PACING GUIDELINES) — how many messages before suggesting a meetup. */
export type MatchPace = 'fast' | 'medium' | 'slow'

export interface PromptSuggestion {
  prompt: string
  answer: string
  maps_to: string[]
}

export interface PhotoRequest {
  purpose: string
  setting: string
  energy: string
}

export interface ProfileAnalysis {
  overall_vibe: string
  communication_style: CommunicationStyle
  strengths: string[]
  gaps: string[]
  /** Null when the user supplied an existing bio to keep — no new draft was generated. */
  bio_draft: string | null
  prompt_suggestions: PromptSuggestion[] | null
  photo_order: string[]
  photo_requests: PhotoRequest[]
}

export interface UserProfile {
  id: string
  display_name: string | null
  bio_draft: string | null
  prompts: PromptSuggestion[]
  photo_analysis: ProfileAnalysis | null
  communication_style: CommunicationStyle | null
  terms_accepted_at: string | null
  terms_version: string | null
  safety_notice_shown_at: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface MatchStyleSummary {
  pace: MatchPace
  investment_read: string
  compatibility_notes: string
  bridge_strategy: string
  green_flags: string[]
  yellow_flags: string[]
  red_flags: string[]
  opening_messages: string[]
}

export interface Match {
  id: string
  user_id: string
  platform: string | null
  /** AI-generated, non-identifying display label — never the match's real name. */
  match_label: string
  style_summary: MatchStyleSummary | null
  archived: boolean
  pinned: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  last_message_at: string
}

export type MessageSender = 'user' | 'match' | 'coach'

export interface MatchMessage {
  id: string
  match_id: string
  sender: MessageSender
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AdminUserSummary {
  id: string
  email: string | null
  displayName: string | null
  isAdmin: boolean
  createdAt: string
  matchCount: number
  lastActiveAt: string | null
  monthSpendUsd: number
}

export type AuditAction = 'user_delete' | 'data_export'

export interface AuditLogEntry {
  id: string
  admin_user_id: string
  action: AuditAction
  target_user_id: string | null
  request_reference: string
  created_at: string
}
