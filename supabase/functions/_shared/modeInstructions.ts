export function profileBuilderInstructions(interviewNotes?: string): string {
  return [
    'Mode: profile_builder.',
    'The attached images are photos the user is considering for their own dating profile.',
    'Follow the PHOTO-DRIVEN PROFILE GENERATION PROTOCOL: analyze each photo, identify the overall',
    'communication style lean, note strengths and gaps, then draft a complementary bio and prompt',
    'suggestions per the STEP 2-5 framework.',
    interviewNotes ? `Additional context from the user: ${interviewNotes}` : '',
    'End your reply with the profile_builder JSON block exactly as specified in the',
    'APP-SPECIFIC OUTPUT CONTRACT.',
  ]
    .filter(Boolean)
    .join(' ')
}

export function matchAnalysisInstructions(platform?: string): string {
  return [
    'Mode: match_analysis.',
    'The attached images are screenshots of a dating profile belonging to someone the user matched',
    platform ? `with on ${platform}` : 'with',
    '. Apply the PROFILE ANALYSIS FRAMEWORK and the Top 10 Psychological Compatibility Factors to',
    'read their communication style and compatibility signals. Also extract their first name if',
    'visible (for the match_name field of the JSON).',
    'End your reply with the match_analysis JSON block exactly as specified in the',
    'APP-SPECIFIC OUTPUT CONTRACT. Add a "match_name" field to that JSON with the best guess at',
    'their first name, or "Match" if not legible.',
  ].join(' ')
}

export function messageCoachingInstructions(hasNewScreenshots: boolean, hasUserText: boolean): string {
  const parts = ['Mode: message_coaching.']
  if (hasNewScreenshots) {
    parts.push(
      'The attached images are new screenshots of the ongoing conversation between the user and this match.',
      'Parse every new message visible in the screenshots in chronological order, labeling each as',
      '"user" (sent by the app user) or "match" (sent by the other person).'
    )
  }
  if (hasUserText) {
    parts.push('The user also asked a direct question or gave an instruction — respond to it directly.')
  }
  parts.push(
    'Apply the translation and coaching guidance to explain what the match is really communicating,',
    'and draft 2-3 reply options the user can edit and send themselves. Keep the pacing target in mind',
    '(date within ~4-6 messages) without ever sacrificing authenticity.',
    'End your reply with the message_coaching JSON block exactly as specified in the',
    'APP-SPECIFIC OUTPUT CONTRACT.'
  )
  return parts.join(' ')
}
