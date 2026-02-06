"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSession, setCurrentSession } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export function ProblemInput() {
  const [problem, setProblem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleStart = () => {
    if (!problem.trim()) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setIsLoading(true);

    const session = createSession(problem.trim());
    setCurrentSession(session);

    router.push("/session");
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <label
            htmlFor="problem"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Choose a topic for your session
          </label>
          <textarea
            id="problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="What do you want to think through? A concept, a design decision, a proof, a debugging problem..."
            className="w-full h-32 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!problem.trim() || isLoading}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <MicIcon />
              Begin Session
            </>
          )}
        </button>

        {isAuthenticated === false && (
          <p className="text-center text-sm text-amber-400/80">
            You&apos;ll need to sign in before starting a session.
          </p>
        )}
      </div>
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
