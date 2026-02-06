import Link from "next/link";
import { ProblemInput } from "@/components/ProblemInput";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Socrates</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 mb-6">
            <SocratesIcon />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Socratic Sessions
          </h2>
          <p className="text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Pick a topic, think out loud, and let Socrates observe your reasoning.
            When your thinking stalls, you&apos;ll get probing questions to
            push you deeper &mdash; never answers.
          </p>
        </div>

        {/* Problem Input -- handles auth internally */}
        <ProblemInput />
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-neutral-500">
          Audio is analyzed for reasoning gaps. Sessions are stored securely in
          the cloud.
        </div>
      </footer>
    </main>
  );
}

function SocratesIcon() {
  return (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
