"use client";

import { useState, useEffect } from "react";
import { ProblemInput } from "@/components/ProblemInput";
import { TopicBrowser } from "@/components/TopicBrowser";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight hover:text-neutral-300 transition-colors">
            Socrates
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/pricing" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Dashboard
            </Link>
            {isLoggedIn === false && (
              <Link href="/login" className="px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Think Out Loud
          </h2>
          <p className="text-neutral-500 max-w-lg mx-auto text-sm leading-relaxed">
            Pick a topic, start talking through it. Socrates listens for reasoning gaps
            and asks you the right questions — never gives answers.
          </p>
        </div>

        <ProblemInput initialTopic={selectedTopic} />

        <div className="mt-12" />

        <TopicBrowser onSelectTopic={setSelectedTopic} />
      </div>

      <Footer />
    </main>
  );
}
