import Link from "next/link";
import { Footer } from "@/components/Footer";

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
        <h1 className="text-2xl font-bold text-white mb-6">Legal Notice</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-neutral-400 text-sm leading-relaxed">
          <p><strong className="text-neutral-200">Last updated:</strong> February 2026</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">Operator</h2>
          <p>
            Socrates is operated by Daniel Colomer, trading as Uncertain Systems.<br />
            Contact: <a href="mailto:daniel@uncertain.systems" className="text-blue-400 hover:text-blue-300">daniel@uncertain.systems</a>
          </p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">Project</h2>
          <p>
            Socrates is an open-source educational technology project. The source code is publicly available at{" "}
            <a href="https://github.com/dncolomer/socrates" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">
              github.com/dncolomer/socrates
            </a>.
          </p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">Disclaimer</h2>
          <p>
            Socrates is an AI-powered learning tool. It is not a substitute for professional education, tutoring, or medical advice. The AI may produce inaccurate or incomplete responses. Use at your own discretion.
          </p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">Intellectual property</h2>
          <p>
            The Socrates name, branding, and design are the property of Uncertain Systems. The underlying software is licensed under the MIT License.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
