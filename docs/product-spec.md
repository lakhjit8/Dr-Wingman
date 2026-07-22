# Dr. Wingman — Dating Communication Coach App

## Product Overview

**Concept:** An AI-powered dating assistant that helps users write better
dating profiles and craft better messages by analyzing communication style
patterns — in the user's own profile, in a match's profile, and in message
threads.

**Target audience:** People who use dating apps but struggle to turn
matches into dates.

**Core insight the app is built around:** People vary in how they
communicate — some lean toward emotional/narrative sharing, others toward
action/logic/directness. Mismatched styles cause missed connections even
when there's real compatibility. The app translates between styles and
coaches users on bridging the gap. (Framed as a spectrum/tendency, not a
strict gender rule — the AI says "often" / "many people," never "all men"
or "all women.")

**Design principle:** The goal is a real-life date, not an endless chat —
people are on these apps to meet, not to make pen pals. The AI coaches
toward moving the conversation forward (target: date secured within ~4-6
messages, sooner if interest is clearly mutual), but the *means* is
authentic, accurate communication — reading the other person correctly and
responding as yourself, not a manipulation script.

---

## 1. Key Features

### Must Have
- **Profile builder**: user uploads their own photos → AI analyzes visual
  communication signals → generates profile bio/prompt suggestions that
  complement the photos.
- **Match analysis**: user uploads screenshots of a match's profile → AI
  produces a communication-style read and compatibility notes.
- **Message coaching**: user uploads screenshots of an existing
  conversation → AI suggests how to respond, explains what the other person
  is likely communicating beneath their style, and drafts message options
  the user can edit and send themselves (user stays in control — no
  auto-send).
- **Screenshot handling**: raw screenshot images are deleted immediately
  after the AI extracts what it needs. Derived text (profile bio drafts,
  match compatibility notes, style analysis, parsed conversation history) is
  persisted per match. Nothing photographic about a match is ever retained
  past the processing step.
- **Data model**: saved user profile; list of saved match profiles; for
  each match, a chat-style thread where the user can drop in new
  screenshots and talk to the AI about next steps. Right-aligned bubbles =
  user's messages, left-aligned = match's messages (as parsed from
  screenshots); coach analysis renders as a distinct card in the same
  thread.

### Nice to Have
- Multi-platform screenshot parsing (Tinder, Hinge, Bumble, etc.)
- Pluggable monetization: flag-driven toggle between free+ads,
  subscription, and one-time purchase.

### Explicitly Out of Scope (v1)
- No automated/scheduled sending of messages on the user's behalf.
- No storing of match photos beyond the analysis step.
- No cross-referencing a match's photos against external sources.
- No retaining match *images* past the processing step.

---

## 2. User Flow

- **Onboarding**: sign up via email, Google, or Apple.
- **Primary action**: upload a screenshot (own profile, match's profile, or
  conversation thread) → AI returns analysis and/or drafted message options
  → user edits/copies and sends manually on the dating platform.

---

## 3. AI Persona & System Prompt

See `docs/dr-wingman-persona.md` — kept as a separate document from this
spec so the persona can be iterated on without touching app structure. It
is loaded verbatim as the system prompt for every Claude API call (see
`supabase/functions/_shared/persona.ts`).

Two modes:
1. **Analysis mode** — reads a profile or conversation, returns a
   communication-style breakdown and compatibility notes.
2. **Coaching mode** — given a message thread or profile draft, suggests
   edits or reply drafts the user can send.

---

## 4. Technical Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) web app | No app store review cycle, fastest to ship and iterate |
| Hosting | Vercel (free tier) | Zero-config deploys from GitHub |
| Backend/DB | Supabase (free tier) | Postgres + Auth + Storage + Edge Functions in one project |
| Auth | Supabase Auth | Email/Google/Apple sign-in built in |
| Image analysis | Claude API (vision), pay-as-you-go | One API for both image analysis and message generation |
| Screenshot storage | Supabase Storage, temp bucket | Edge Function deletes the image immediately after the Claude API call returns |

---

## 5. Monetization & Constraints

- **Business model**: free with ads at launch; paywall/ad logic sits behind
  a feature flag (`VITE_MONETIZATION_MODE`) so subscription or
  one-time-purchase can be swapped in later without a rewrite. See
  `src/lib/featureFlags.ts` and `src/components/PaywallGate.tsx`.
- **Timeline**: target launch within a week.
- **Budget**: low/medium — managed services (Supabase, Vercel) over custom
  infra.

---

## 6. Compliance Notes

- Dating platforms (Tinder, Hinge, etc.) generally prohibit scraping and
  bot-assisted messaging in their ToS. This app does not automate posting
  to those platforms (user copies/pastes manually), which reduces but
  doesn't eliminate that risk — the Terms of Service should make clear the
  user is responsible for how they use generated content.
- Match screenshots contain another person's photo and personal info. The
  image itself is deleted right after processing, enforced server-side in
  the Edge Function (storage object removed once the vision call returns),
  not just cleared from the UI. Only the derived text analysis persists.
