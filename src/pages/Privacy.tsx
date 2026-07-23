import { Link } from 'react-router-dom'

export function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/login" className="text-sm text-wingman-700 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Privacy Policy</h1>
      <p className="mt-2 text-sm italic text-neutral-500">
        Working draft — not final legal advice. Review with counsel before relying on this as your
        binding policy.
      </p>

      <div className="prose-sm mt-6 space-y-5 text-sm leading-relaxed text-neutral-700">
        <section>
          <h2 className="text-base font-semibold text-neutral-900">What We Collect</h2>
          <ul className="list-inside list-disc space-y-1">
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

        <section>
          <h2 className="text-base font-semibold text-neutral-900">What We Don't Do</h2>
          <ul className="list-inside list-disc space-y-1">
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

        <section>
          <h2 className="text-base font-semibold text-neutral-900">Data Retention</h2>
          <ul className="list-inside list-disc space-y-1">
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

        <section>
          <h2 className="text-base font-semibold text-neutral-900">Your Rights</h2>
          <p>
            Depending on your location (e.g., California under CCPA, EU under GDPR), you may have
            the right to access, delete, or export your data. Contact{' '}
            <a href="mailto:lakhjitsingh8@gmail.com" className="underline">
              lakhjitsingh8@gmail.com
            </a>{' '}
            to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">Security</h2>
          <p>
            We use industry-standard encryption in transit and at rest, and we will notify
            affected users in the event of a data breach as required by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">Third-Party Processors</h2>
          <p>
            We use third-party infrastructure providers — Supabase (database, authentication, and
            file storage), Anthropic (AI analysis via the Claude API), and Vercel (application
            hosting) — to operate the app. These providers process data solely to provide the
            service and are contractually bound to protect it.
          </p>
        </section>

        <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-400">
          Questions about this Privacy Policy? Contact{' '}
          <a href="mailto:lakhjitsingh8@gmail.com" className="underline">
            lakhjitsingh8@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
