export function profileBuilderInstructions(interviewNotes?: string, existingBio?: string): string {
  return [
    'Mode: profile_builder.',
    'The attached images are photos the user is considering for their own dating profile.',
    existingBio
      ? [
          'The user already has an existing bio/prompts they want to keep:',
          `"""${existingBio}"""`,
          'Per the existing-bio branch in the APP-SPECIFIC OUTPUT CONTRACT, use this as additional',
          'context alongside the photos for overall_vibe, strengths, and gaps — do NOT draft a new bio',
          'or prompt suggestions; set bio_draft and prompt_suggestions to null.',
        ].join(' ')
      : [
          'Follow the PHOTO-DRIVEN PROFILE GENERATION PROTOCOL: analyze each photo, identify the overall',
          'communication style lean, note strengths and gaps, then draft a complementary bio and prompt',
          'suggestions per the STEP 2-5 framework.',
        ].join(' '),
    interviewNotes ? `Additional context from the user: ${interviewNotes}` : '',
    'End your reply with the profile_builder JSON block exactly as specified in the',
    'APP-SPECIFIC OUTPUT CONTRACT.',
  ]
    .filter(Boolean)
    .join(' ')
}

export function matchAnalysisInstructions(platform?: string, otherMatchesContext?: string): string {
  return [
    'Mode: match_analysis.',
    'The attached images are screenshots of a dating profile belonging to someone the user matched',
    platform ? `with on ${platform}` : 'with',
    '. Apply the 5-LAYER ANALYSIS FRAMEWORK (Decode + Diagnose in particular), the PACING GUIDELINES,',
    'the INVESTMENT THERMOMETER, and the COMPATIBILITY ASSESSMENT (green/yellow/red flags) to read',
    'this match\'s profile. Per the SAFETY & PRIVACY REQUIREMENTS and the app-specific implementation',
    'notes beneath them, never extract or output their real name, employer, school, or exact',
    'location — generate label_traits instead (2 short non-identifying style/vibe descriptors). Then',
    'draft 3 opening messages the user could send this match, per the opening_messages field,',
    'applying the LENGTH RULE, ENERGY MATCHING, and EMOJI STRATEGY sections.',
    otherMatchesContext
      ? [
          'The user has other saved matches with these prior communication-style reads:',
          otherMatchesContext,
          'Per the cross-match patterns section of the APP-SPECIFIC OUTPUT CONTRACT, look for a',
          'recurring theme across them and this new match and surface it in cross_match_patterns,',
          'staying interpretive and hedged. If nothing meaningful stands out, set it to null.',
        ].join(' ')
      : '',
    'End your reply with the match_analysis JSON block exactly as specified in the',
    'APP-SPECIFIC OUTPUT CONTRACT.',
  ]
    .filter(Boolean)
    .join(' ')
}

export function messageCoachingInstructions(hasNewScreenshots: boolean, hasUserText: boolean): string {
  const parts = ['Mode: message_coaching.']
  if (hasNewScreenshots) {
    parts.push(
      'The attached images are new screenshots of the ongoing conversation between the user and this match.',
      'Parse every new message visible in the screenshots in chronological order, labeling each as',
      '"user" (sent by the app user) or "match" (sent by the other person). Per the SAFETY & PRIVACY',
      'REQUIREMENTS\' app-specific implementation notes, if the match\'s own message text includes',
      'their real name (an introduction, a sign-off), replace it with "[name]" in the parsed_messages',
      'text you output — never transcribe it verbatim, and never use their name anywhere else in your',
      'reply either.'
    )
  }
  if (hasUserText) {
    parts.push('The user also asked a direct question or gave an instruction — respond to it directly.')
  }
  parts.push(
    'Apply LAYER 1 (Decode) and LAYER 2 (Diagnose) to explain what the match is really communicating,',
    'then LAYER 4 (Strategize) to draft 2-3 reply options per the LENGTH RULE, ENERGY MATCHING, and',
    'EMOJI STRATEGY sections. Apply LAYER 5 (Execute) and this match\'s PACING GUIDELINES tier',
    '(fast/medium/slow, from prior context if known) to the momentum_note — never achieve pacing by',
    'misrepresenting the user or manipulating the match; the means is always authentic communication.',
    'End your reply with the message_coaching JSON block exactly as specified in the',
    'APP-SPECIFIC OUTPUT CONTRACT.'
  )
  return parts.join(' ')
}
