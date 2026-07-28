import { Link } from 'react-router-dom'
import { LLC_LEGAL_NAME, EFFECTIVE_DATE } from '../lib/legal'

export function Privacy() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-wingman-900 px-4 pb-6 pt-10 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <Link to="/login" className="text-sm text-white hover:underline">
            ← Back
          </Link>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-white/55">
            Effective Date: {EFFECTIVE_DATE}
            <br />
            Operated by: {LLC_LEGAL_NAME}, a California limited liability company
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">What We Collect</h2>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm leading-relaxed text-neutral-700">
            <li>Account info (email, or Google/Apple sign-in identifiers)</li>
            <li>Your own profile content you choose to upload</li>
            <li>
              Screenshots of matches' profiles/conversations you choose to upload (processed
              transiently — see Data Retention below; not persistently stored)
            </li>
            <li>
              Derived text analysis generated from the above, including an AI-generated,
              non-identifying label for each match (never a real name)
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">What We Don't Do</h2>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm leading-relaxed text-neutral-700">
            <li>We do not require a selfie or government ID to use the app.</li>
            <li>We do not sell your data or a match's data to third parties.</li>
            <li>
              We do not perform facial recognition, and we do not analyze facial features or
              physical appearance of any person.
            </li>
            <li>We do not retain uploaded images beyond the brief processing window.</li>
            <li>
              We do not extract, store, or display a match's real name, even if visible in an
              uploaded screenshot.
            </li>
            <li>We do not share match-derived data outside your own account.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Data Retention</h2>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm leading-relaxed text-neutral-700">
            <li>
              Images: not persisted; processed transiently and any temporary copy is removed
              within minutes, verified by an automated cleanup process.
            </li>
            <li>
              Derived text profiles/notes/labels: retained until you delete the match or your
              account.
            </li>
            <li>Account data: retained until account deletion, per applicable law.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Your Rights</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            Depending on your location (e.g., California under CCPA, EU under GDPR), you may have
            the right to access, delete, or export your data. Contact{' '}
            <a href="mailto:ldvendingllc@gmail.com" className="underline">
              ldvendingllc@gmail.com
            </a>{' '}
            to exercise these rights.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Security</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            We use industry-standard encryption in transit and at rest, and we will notify
            affected users in the event of a data breach as required by applicable law.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Third-Party Processors</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            We use third-party infrastructure providers — Supabase (database, authentication, and
            file storage), Anthropic (AI analysis via the Claude API), and Vercel (application
            hosting) — to operate the app. These providers process data solely to provide the
            service and are contractually bound to protect it.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Contact</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            Questions about these Terms or this Privacy Policy:{' '}
            <a href="mailto:ldvendingllc@gmail.com" className="underline">
              ldvendingllc@gmail.com
            </a>
            , or by mail at {LLC_LEGAL_NAME}'s registered address on file with the California
            Secretary of State.
          </p>
        </section>
      </div>
    </div>
  )
}
