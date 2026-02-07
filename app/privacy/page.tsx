import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy - Socratic Lesson",
  description: "Privacy Policy for Socratic Lesson - How we collect, use, and protect your data",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">Socratic Lesson</Link>
          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Privacy Policy</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-neutral-600 mb-8">Last updated: February 2026</p>

        <div className="space-y-8 text-sm text-neutral-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">1. Introduction</h2>
            <p>
              Uncertain Systems (&quot;Socratic Lesson&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use Socratic Lesson and our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">2. Information We Collect</h2>
            <h3 className="text-sm font-medium text-neutral-300 mb-2">Personal Information</h3>
            <p className="mb-3">We may collect personal information that you voluntarily provide to us when you:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Register for an account</li>
              <li>Start a Socratic tutoring session</li>
              <li>Upload think-aloud transcripts</li>
              <li>Connect a Muse EEG headband</li>
              <li>Subscribe to a paid plan</li>
              <li>Contact us for support</li>
            </ul>
            <p className="mb-3">
              This information may include: email address, username, audio recordings during sessions,
              EEG brainwave data, uploaded transcripts, and session metadata.
            </p>

            <h3 className="text-sm font-medium text-neutral-300 mb-2">Automatically Collected Information</h3>
            <p>
              When you visit our website, we automatically collect certain information about
              your device, including browser type, IP address, and time zone. We do not use
              analytics or advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide the Socratic tutoring experience (audio analysis, probe generation, reports)</li>
              <li>Store and replay your session history</li>
              <li>Personalize probes using your uploaded think-aloud transcripts</li>
              <li>Record and summarize EEG data during sessions</li>
              <li>Process payments and manage subscriptions</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Improve our platform and AI tutoring quality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">4. Third-Party Services</h2>
            <p className="mb-3">We share data with the following third-party services, strictly to operate Socratic Lesson:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-neutral-300">Supabase</strong> — authentication, database, and file storage (audio, EEG, transcripts)</li>
              <li><strong className="text-neutral-300">OpenRouter</strong> — AI model inference for audio analysis, probe generation, and reports</li>
              <li><strong className="text-neutral-300">ElevenLabs</strong> — text-to-speech for reading probes aloud</li>
              <li><strong className="text-neutral-300">Stripe</strong> — payment processing (we never see or store your card details)</li>
              <li><strong className="text-neutral-300">Vercel</strong> — website hosting</li>
            </ul>
            <p className="mt-3">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect
              your personal information. Audio recordings and EEG data are stored in private,
              per-user storage buckets. However, no electronic transmission over the Internet
              or information storage technology can be guaranteed to be 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">6. Your Rights (GDPR)</h2>
            <p className="mb-3">
              If you are a resident of the European Economic Area (EEA), you have certain data
              protection rights:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-neutral-300">Access:</strong> Request access to your personal data</li>
              <li><strong className="text-neutral-300">Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong className="text-neutral-300">Erasure:</strong> Request deletion of your personal data</li>
              <li><strong className="text-neutral-300">Restriction:</strong> Request restriction of processing</li>
              <li><strong className="text-neutral-300">Portability:</strong> Request transfer of your data</li>
              <li><strong className="text-neutral-300">Objection:</strong> Object to processing of your data</li>
              <li><strong className="text-neutral-300">Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="mt-3">To exercise these rights, please contact us at daniel@uncertain.systems.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">7. Data Retention</h2>
            <p>
              We retain your personal information only for as long as necessary to fulfill the
              purposes for which it was collected. You can delete any session from your dashboard
              at any time — all associated data (audio, EEG, probes, reports) is permanently removed.
              Account deletion can be requested via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">8. Children&apos;s Privacy</h2>
            <p>
              Our services are not directed to children under 16. We do not knowingly collect
              personal information from children. If you believe we have collected information
              from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">10. Contact Us</h2>
            <p className="mb-3">If you have questions about this Privacy Policy, please contact us at:</p>
            <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-1">
              <p><strong className="text-neutral-300">Email:</strong> daniel@uncertain.systems</p>
              <p><strong className="text-neutral-300">Company:</strong> Uncertain Systems (Daniel Colomer)</p>
              <p><strong className="text-neutral-300">Location:</strong> Hamburg, Germany</p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
