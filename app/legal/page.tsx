import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Legal Notice - Socrates",
  description: "Legal Notice and company information for Socrates",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">Socrates</Link>
          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Legal Notice</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Legal Notice</h1>
        <p className="text-xs text-neutral-600 mb-8">Last updated: February 2026</p>

        <div className="space-y-8 text-sm text-neutral-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">1. Company Information</h2>
            <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-1">
              <p><strong className="text-neutral-300">Company Name:</strong> Uncertain Systems</p>
              <p><strong className="text-neutral-300">Owner:</strong> Daniel Colomer</p>
              <p><strong className="text-neutral-300">Location:</strong> Hamburg, Germany</p>
              <p><strong className="text-neutral-300">Contact Email:</strong> daniel@uncertain.systems</p>
              <p><strong className="text-neutral-300">Website:</strong> socrates.uncertain.systems</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">2. Platform Description</h2>
            <p className="mb-3">
              Socrates is an AI-powered Socratic tutoring tool operated by Uncertain Systems.
              The platform is part of our broader mission of educational accelerationism (edu/acc).
              Our activities include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Real-time AI-guided Socratic questioning during learning sessions</li>
              <li>Audio analysis and reasoning gap detection</li>
              <li>EEG brainwave recording and visualization via Muse integration</li>
              <li>Personalized tutoring through think-aloud transcript analysis</li>
              <li>Post-session reporting and learning analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">3. Intellectual Property Rights</h2>
            <p className="mb-3">All content on this website, including but not limited to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Socrates brand name and design</li>
              <li>Website design and layout</li>
              <li>Platform code and software</li>
              <li>AI prompts and tutoring methodology</li>
            </ul>
            <p className="mt-3">
              are the property of Uncertain Systems or its licensors and are protected by
              copyright, trademark, and other intellectual property laws.
            </p>
            <p className="mt-3">
              The platform source code is open source under the MIT License and available at{" "}
              <a href="https://github.com/dncolomer/socrates" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">
                github.com/dncolomer/socrates
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">4. User Content</h2>
            <p>
              Users retain ownership of all content they create, including audio recordings,
              transcripts, and session data. By using Socrates, users grant Uncertain Systems
              a non-exclusive license to process such content for the purpose of providing the
              tutoring service. This content is not used for AI training without explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">5. AI Disclaimer</h2>
            <p>
              Socrates uses artificial intelligence models provided by third parties (via OpenRouter).
              Users acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>AI-generated questions and reports may be inaccurate or incomplete</li>
              <li>Socrates is not a substitute for professional education or tutoring</li>
              <li>EEG data visualization is for informational purposes and is not medical advice</li>
              <li>The platform is an experimental educational tool</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">6. Liability Disclaimer</h2>
            <p className="mb-3">
              The information on this website is provided &quot;as is&quot; without any warranties,
              express or implied. Uncertain Systems:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Does not warrant the accuracy of AI-generated content</li>
              <li>Does not guarantee uninterrupted or error-free service</li>
              <li>Is not liable for any learning outcomes or educational results</li>
              <li>Is not responsible for any EEG device malfunctions or data inaccuracies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">7. External Links</h2>
            <p>
              Our website may contain links to third-party websites, including GitHub, Stripe,
              and other services. These links are provided for convenience only. Uncertain Systems
              has no control over and assumes no responsibility for the content or practices of any
              third-party websites.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">8. Governing Law</h2>
            <p>
              This legal notice and any disputes arising from the use of this website
              shall be governed by and construed in accordance with the laws of Germany.
              Any legal proceedings shall be subject to the exclusive jurisdiction of
              the courts of Hamburg, Germany.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">9. Contact</h2>
            <p className="mb-3">For any legal inquiries or concerns, please contact us at:</p>
            <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-1">
              <p><strong className="text-neutral-300">Email:</strong> daniel@uncertain.systems</p>
              <p><strong className="text-neutral-300">Location:</strong> Hamburg, Germany</p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
