import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">Socrates</Link>
          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Privacy Policy</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-6">Privacy Policy</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-neutral-400 text-sm leading-relaxed">
          <p><strong className="text-neutral-200">Last updated:</strong> February 2026</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">1. What we collect</h2>
          <p>When you use Socrates, we collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your email address and username (for authentication)</li>
            <li>Audio recordings during learning sessions (stored securely, never shared)</li>
            <li>Session metadata: topic, duration, probes, and AI-generated reports</li>
            <li>EEG data if you connect a Muse headband (stored securely, never shared)</li>
            <li>Think-aloud transcripts you voluntarily upload</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">2. How we use it</h2>
          <p>Your data is used solely to provide and improve the Socratic tutoring experience. We do not sell your data. Audio and EEG recordings are processed in real-time and stored in your private Supabase storage bucket.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">3. Third-party services</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-neutral-300">Supabase</strong> — authentication, database, and file storage</li>
            <li><strong className="text-neutral-300">OpenRouter</strong> — AI model inference (audio analysis, probe generation)</li>
            <li><strong className="text-neutral-300">ElevenLabs</strong> — text-to-speech for reading probes aloud</li>
            <li><strong className="text-neutral-300">Stripe</strong> — payment processing (we never see your card details)</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">4. Data retention</h2>
          <p>You can delete any session from your dashboard at any time. When you delete a session, all associated data (audio, EEG, probes, reports) is permanently removed.</p>

          <h2 className="text-lg font-semibold text-neutral-200 mt-8">5. Contact</h2>
          <p>Questions? Reach out at <a href="mailto:daniel@uncertain.systems" className="text-blue-400 hover:text-blue-300">daniel@uncertain.systems</a>.</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
