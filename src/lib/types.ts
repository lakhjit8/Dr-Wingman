export type CommunicationStyle = 'action-oriented' | 'emotional-relational' | 'balanced'

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
  bio_draft: string
  prompt_suggestions: PromptSuggestion[]
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
  created_at: string
  updated_at: string
}

export interface CompatibilityFactor {
  factor: string
  read: string
}

export interface MatchStyleSummary {
  communication_style: CommunicationStyle
  compatibility_factors: CompatibilityFactor[]
  compatibility_notes: string
  bridge_strategy: string
  red_flags: string[]
  style_differences: string[]
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
  created_at: string
  updated_at: string
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
