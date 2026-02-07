"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSession } from "@/lib/storage";

interface ProblemInputProps {
  initialTopic?: string;
}

export function ProblemInput({ initialTopic }: ProblemInputProps) {
  const [problem, setProblem] = useState(initialTopic || "");
  const [isLoading, setIsLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const router = useRouter();

  // Sync when parent changes the topic
  if (initialTopic && initialTopic !== problem && !isLoading) {
    setProblem(initialTopic);
  }

  const handleStart = async () => {
    if (!problem.trim()) return;
    setIsLoading(true);
    setUsageError(null);

    // Check usage limits
    try {
      const res = await fetch("/api/check-usage");
      if (res.ok) {
        const usage = await res.json();
        if (!usage.allowed) {
          setUsageError(usage.reason || "Session limit reached.");
          setIsLoading(false);
          return;
        }
      } else {
        // If check fails, block to be safe
        setUsageError("Could not verify usage. Please try again.");
        setIsLoading(false);
        return;
      }
    } catch {
      // If network fails, block to be safe
      setUsageError("Could not verify usage. Please try again.");
      setIsLoading(false);
      return;
    }

    try {
      // Create session in Supabase and consume an extra lesson if over base limit
      const session = await createSession(problem.trim());
      // Consume extra lesson server-side
      fetch("/api/check-usage", { method: "POST" }).catch(() => {});
      // Navigate to session page with DB id
      router.push(`/session?id=${session.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create session";
      setUsageError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <textarea
          id="problem"
          value={problem}
          onChange={(e) => { setProblem(e.target.value); setUsageError(null); }}
          placeholder="What do you want to think through?"
          className="w-full h-28 px-4 pt-3.5 pb-14 pr-32 bg-neutral-900/80 border border-neutral-800 rounded-2xl text-white text-[15px] placeholder-neutral-600 focus:outline-none focus:border-neutral-600 resize-none transition-colors"
          disabled={isLoading}
        />
        <button
          onClick={handleStart}
          disabled={!problem.trim() || isLoading}
          className="absolute right-4 bottom-4 px-4 py-2 bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 text-black text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <MicIcon />
          )}
          {isLoading ? "Starting..." : "Start"}
        </button>
      </div>
      {usageError && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {usageError}{" "}
          <Link href="/pricing" className="underline hover:text-red-300">
            View plans
          </Link>
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
