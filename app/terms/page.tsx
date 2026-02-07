import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">Socrates</Link>
          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Terms & Conditions</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-6">Terms & Conditions</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-neutral-400 text-sm leading-relaxed">
          <p><strong className="text-neutral-200">Last updated:</strong> February 2026</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">1. Service</h2>
          <p>Socrates is an AI-powered Socratic tutoring tool. It is designed to support learning by asking questions — it does not provide answers, guarantees of accuracy, or replace professional education.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">2. Accounts</h2>
          <p>You must create an account to use Socrates. You are responsible for keeping your credentials secure. We reserve the right to suspend accounts that violate these terms.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">3. Subscriptions & payments</h2>
          <p>Paid plans are billed monthly via Stripe. You can cancel anytime from your Stripe billing portal. Refunds are handled on a case-by-case basis — contact us if you have an issue.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">4. Your content</h2>
          <p>You retain ownership of all content you create (audio recordings, transcripts, etc.). By using the service, you grant us a limited license to process this content to provide the tutoring experience.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">5. Open source</h2>
          <p>Socrates is open source under the MIT license. The source code is available at <a href="https://github.com/dncolomer/socrates" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">github.com/dncolomer/socrates</a>.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">6. Limitation of liability</h2>
          <p>Socrates is provided &quot;as is&quot; without warranties. We are not liable for any damages arising from your use of the service.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">7. Contact</h2>
          <p>Questions? Reach out at <a href="mailto:daniel@uncertain.systems" className="text-blue-400 hover:text-blue-300">daniel@uncertain.systems</a>.</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
