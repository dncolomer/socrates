"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
      <p className="text-sm text-neutral-500 mb-8">Sign in to continue your sessions.</p>

      <form onSubmit={handleLogin} className="space-y-3.5">
        <div>
          <label htmlFor="email" className="block text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-neutral-600 transition-colors"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-neutral-600 transition-colors"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 text-black text-sm font-medium rounded-xl transition-colors mt-2"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-xs text-neutral-600 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-neutral-400 hover:text-white transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-lg font-semibold text-white tracking-tight">
            Socrates
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <Suspense fallback={
          <div className="w-full max-w-sm text-center text-neutral-600 text-sm">Loading...</div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
