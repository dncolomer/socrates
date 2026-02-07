import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">Socrates</Link>
          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Cookie Policy</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-6">Cookie Policy</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-neutral-400 text-sm leading-relaxed">
          <p><strong className="text-neutral-200">Last updated:</strong> February 2026</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">What cookies do we use?</h2>
          <p>Socrates uses minimal cookies, strictly necessary for the service to function:</p>

          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-neutral-300">Authentication cookies</strong> — set by Supabase to keep you logged in. These are essential and cannot be disabled.
            </li>
            <li>
              <strong className="text-neutral-300">Stripe cookies</strong> — set during checkout to process payments securely. These are only present during the payment flow.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">What we don&apos;t use</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No analytics or tracking cookies</li>
            <li>No advertising cookies</li>
            <li>No third-party marketing cookies</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">Contact</h2>
          <p>Questions? Reach out at <a href="mailto:daniel@uncertain.systems" className="text-blue-400 hover:text-blue-300">daniel@uncertain.systems</a>.</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
