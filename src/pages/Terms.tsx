import { Link } from 'react-router-dom'

export function Terms() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/login" className="text-sm text-wingman-700 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Terms of Service</h1>
      <p className="mt-2 text-sm italic text-neutral-500">
        Working draft — not final legal advice. Review with counsel before relying on this as your
        binding terms.
      </p>

      <div className="prose-sm mt-6 space-y-5 text-sm leading-relaxed text-neutral-700">
        <section>
          <h2 className="text-base font-semibold text-neutral-900">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using Dr. Wingman, you agree to these Terms and the
            accompanying Privacy Policy. If you do not agree, do not use the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">2. Eligibility</h2>
          <p>
            You must be at least 18 years old to use this app. By using it, you represent that you
            are 18 or older and that any individual whose photo or profile information you upload
            is also 18 or older to your knowledge.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">
            3. Your Responsibility Regarding Third-Party Platforms
          </h2>
          <p>
            Dr. Wingman is a communication-coaching tool and is not affiliated with, endorsed by,
            or operated by Tinder, Hinge, Bumble, or any other dating platform. You are solely
            responsible for ensuring your use of this app, including uploading screenshots from
            those platforms, complies with their respective terms of service. Dr. Wingman
            disclaims any liability arising from actions taken against your account on a
            third-party platform.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">4. User Content and Representations</h2>
          <p>
            When you upload a photo, screenshot, or profile information — whether your own or
            belonging to another person (a "match") — you represent and warrant that:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>You have the right to share that content with us;</li>
            <li>You will not upload content depicting anyone under 18;</li>
            <li>You are not using the app to harass, stalk, impersonate, or deceive another person;</li>
            <li>
              You will not attempt to enter, save, or otherwise persist a match's real name or
              other identifying information anywhere in the app — the app is designed to prevent
              this, but you agree not to circumvent it;
            </li>
            <li>
              You understand any analysis of a match's content reflects an AI-generated
              interpretation, not a factual or professional assessment of that person.
            </li>
          </ul>
          <p className="mt-2">
            <strong>Indemnification.</strong> You agree to indemnify and hold Dr. Wingman harmless
            from any claim, damage, or legal proceeding arising from content you upload, including
            claims brought by a third party (such as a match) whose likeness or information you
            shared with the app without their knowledge.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">5. How We Handle Photos and Match Data</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>
              We do not require or collect a selfie, government ID, or any biometric verification
              to create an account.
            </li>
            <li>
              Uploaded screenshots (yours or a match's) are processed only to generate a
              text-based analysis — they are never written to persistent storage as part of
              normal operation, and any transient copy used mid-processing is deleted immediately,
              within minutes at most.
            </li>
            <li>
              We do not perform facial recognition and do not analyze facial features, facial
              geometry, or physical appearance of any person. Image analysis is limited to general
              visual context — setting, activity, tone, composition — for the purpose of
              profile/message coaching.
            </li>
            <li>
              We do not extract, store, or display any match's real name, even though it may be
              visible in an uploaded screenshot. Matches are labeled using a short description
              generated automatically by the AI from communication-style signals only (e.g.,
              "Outdoorsy, direct communicator") — this label is never user-entered and never
              derived from identifying details.
            </li>
            <li>
              Derived text analysis (style notes, compatibility notes, the AI-generated label
              described above) is retained as part of your account so you can revisit past
              matches, until you delete it or your account.
            </li>
            <li>
              Because we do not collect biometric identifiers (no ID/selfie verification, no
              facial analysis), state biometric privacy laws such as Illinois's BIPA are not
              implicated by our data practices.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">
            6. Nature of the Service — Not Professional Advice
          </h2>
          <p>
            Dr. Wingman provides AI-generated coaching and analysis for entertainment and
            self-improvement purposes. It is <strong>not</strong> psychological, psychiatric,
            therapeutic, or counseling services, and the "Dr. Wingman" persona is a product
            feature, not a licensed professional. AI-generated analysis of a profile or photo is
            an automated interpretation and may be inaccurate, incomplete, or wrong. Do not rely
            on it as a factual or clinical assessment of yourself or another person. Analysis and
            labels describing a match reflect the app's interpretation of their public profile
            content, not a verified or factual characterization of that person.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">7. Your Safety</h2>
          <p>
            Dr. Wingman may suggest strategies for arranging in-person meetings with people you
            have not met. <strong>Always meet new people in public places, tell a friend or family
            member your plans, arrange your own transportation, and trust your instincts if
            something feels wrong.</strong> Dr. Wingman is not responsible for interactions,
            meetings, or outcomes that occur outside the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">8. No Guarantee of Outcomes</h2>
          <p>
            Dr. Wingman does not guarantee any match, response, date, or relationship outcome.
            Coaching suggestions, including any pacing guidance, are general in nature and are not
            a promise of results.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Dr. Wingman and its operators are not liable
            for indirect, incidental, or consequential damages arising from your use of the app,
            including damages arising from your interactions with other individuals, third-party
            platforms, or reliance on AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">10. Termination</h2>
          <p>
            We may suspend or terminate your account for violation of these Terms, including
            uploading content depicting a minor, harassment, or misuse of the app to deceive or
            harm another person.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">11. Governing Law & Disputes</h2>
          <p className="italic text-neutral-500">
            To be completed with counsel — governing state, arbitration clause if desired, class
            action waiver if desired.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-neutral-900">12. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time; continued use after changes constitutes
            acceptance.
          </p>
        </section>

        <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-400">
          Questions about these Terms? Contact{' '}
          <a href="mailto:lakhjitsingh8@gmail.com" className="underline">
            lakhjitsingh8@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
