# Persona Update Spec: Dr. Wingman v2

**Instructions:** Replace the existing Dr. Wingman system prompt/persona
content with the new framework (full replacement of voice/framework/
instructions, not a merge with the old wording). Append the Safety &
Privacy Addendum to the end of the new persona, in the same system prompt —
it carries forward requirements established earlier in the project (no
facial analysis, no name extraction, hedged framing about real people, no
verbatim quoting) that the new persona document doesn't mention; the update
must not silently drop them.

After deploying, re-run the automated tests from `risk-verification-spec.md`
(Section 1.2 name-leakage test in particular) against the new persona — the
new framework's emphasis on psychological profiling increases the chance
the model surfaces something it shouldn't if the addendum isn't being
followed correctly.

## Scope note (resolved during implementation)

The new persona content (below) only addresses match analysis and message
coaching — it has no equivalent for the Profile Builder feature (building
the user's own profile from their own photos), which the prior persona
covered via a "GOAL 2: PROFILE BUILDER MODE ACTIVATION" protocol and a
10-factor compatibility table that Profile Builder's `prompt_suggestions`
output depends on. Rather than treat "full replacement" as removing that
protocol too (which isn't addressed anywhere in this spec and would
silently break a working, unrelated feature), the implementation replaces
only the match-analysis/message-coaching voice and framework, and carries
the Profile Builder protocol forward unchanged. See
`docs/dr-wingman-persona.md` for what actually shipped, including how the
Safety & Privacy Addendum's "no verbatim quoting" rule was reconciled with
the `message_coaching` mode's `parsed_messages` field, which necessarily
transcribes real conversation text for the app's chat-thread UI.

The new framework also drops the old `communication_style: action-oriented
| emotional-relational | balanced` categorization for match analysis in
favor of its own `pace: fast | medium | slow` framework (from the new
persona's PACING GUIDELINES section). The output contract field was renamed
accordingly for `match_analysis` only — `profile_builder` and
`profiles.communication_style` (used only by Profile Builder, with a DB
check constraint) keep the original three-way categorization, since the new
persona doesn't address that mode.

---

## Part 1: New Persona Content

See `docs/dr-wingman-persona.md` — reproduced there in full as the
"DR. WINGMAN SYSTEM PROMPT" section.

## Part 2: Mandatory Safety & Privacy Addendum

See `docs/dr-wingman-persona.md`'s "SAFETY & PRIVACY REQUIREMENTS
(NON-NEGOTIABLE)" section, plus the "App-specific implementation notes"
immediately below it (the additional specifics this project established
after the original addendum was written — re-identifying details beyond
name, name-redaction inside transcribed messages — carried forward so they
aren't lost in this update).

## Testing checklist after deployment

- [ ] Re-run the name-leakage test (`tests/name-leakage.test.ts`) against
      the new persona
- [ ] Spot-check that Psychological Profile / Diagnose output uses hedged
      language, not unqualified diagnostic claims
- [ ] Confirm no facial/appearance commentary appears in Match Analysis
      output
- [ ] Confirm match labels in output match the AI-generated, non-identifying
      format (`label_traits`) rather than any name the persona's "Client
      Context" section might otherwise invite
