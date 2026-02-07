import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms & Conditions - Socratic Lesson",
  description: "Terms and Conditions for Socratic Lesson",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">Socratic Lesson</Link>
          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Terms & Conditions</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Terms & Conditions</h1>
        <p className="text-xs text-neutral-600 mb-8">Last updated: February 2026</p>

        <div className="space-y-8 text-sm text-neutral-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using Socratic Lesson, operated by Uncertain Systems (&quot;Company&quot;, &quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms and Conditions. If you
              disagree with any part of these terms, you may not access our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">2. Platform Description</h2>
            <p className="mb-3">
              Socratic Lesson is an AI-powered Socratic tutoring tool that helps users learn through
              guided questioning. The platform is part of our broader mission of educational
              accelerationism (edu/acc). Our services include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Real-time audio analysis during learning sessions</li>
              <li>AI-generated Socratic questions (probes) to deepen understanding</li>
              <li>Post-session reports and analytics</li>
              <li>EEG brain activity recording via Muse headband integration</li>
              <li>Personalized tutoring via think-aloud transcript analysis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">3. Account Registration</h2>
            <p className="mb-3">To use Socratic Lesson, you must create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">4. Subscriptions & Payments</h2>
            <p className="mb-3">Regarding paid plans and payments:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Paid plans (Regular, Pro) are billed monthly via Stripe</li>
              <li>You can cancel your subscription at any time</li>
              <li>Extra lessons can be purchased as one-time payments</li>
              <li>Refunds are handled on a case-by-case basis — contact us if you have an issue</li>
              <li>We reserve the right to change pricing with reasonable notice</li>
              <li>Tax obligations are your sole responsibility</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">5. Your Content</h2>
            <p className="mb-3">When you use Socratic Lesson:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You retain ownership of all content you create (audio recordings, transcripts, etc.)</li>
              <li>You grant us a limited license to process this content to provide the tutoring experience</li>
              <li>You can delete any session and all associated data at any time from your dashboard</li>
              <li>We do not use your content for training AI models without explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">6. AI Disclaimer</h2>
            <p>
              Socratic Lesson uses AI models to generate questions, analyze audio, and produce reports.
              AI-generated content may be inaccurate, incomplete, or misleading. Socratic Lesson is a
              learning tool — it does not provide answers, and it is not a substitute for
              professional education, tutoring, or medical advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">7. Prohibited Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create multiple accounts to exploit the free tier</li>
              <li>Use automated tools to abuse the service</li>
              <li>Attempt to reverse-engineer or extract AI model outputs at scale</li>
              <li>Upload harmful, illegal, or abusive content</li>
              <li>Interfere with the proper functioning of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">8. Intellectual Property</h2>
            <p>
              The Socratic Lesson brand, website design, and platform code are the property of
              Uncertain Systems. The platform source code is open source under the MIT License
              and available at{" "}
              <a href="https://github.com/dncolomer/socrates" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">
                github.com/dncolomer/socrates
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">9. Disclaimer of Warranties</h2>
            <p>
              Socratic Lesson is provided &quot;as is&quot; without any warranties, express or implied.
              We do not warrant that the platform will be uninterrupted, secure, or error-free.
              We make no guarantees regarding the accuracy of AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Uncertain Systems shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages
              arising from your use of Socratic Lesson.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of
              Germany, without regard to its conflict of law provisions. Any legal proceedings
              shall be subject to the exclusive jurisdiction of the courts of Hamburg, Germany.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users
              of material changes by posting the new Terms on this page with an updated
              revision date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">13. Contact Information</h2>
            <p className="mb-3">For questions about these Terms and Conditions, please contact us at:</p>
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
