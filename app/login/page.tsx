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
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
      <p className="text-neutral-400 mb-8">Sign in to continue your sessions.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-neutral-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-neutral-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-xl font-bold text-white">
            Socrates
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <Suspense fallback={
          <div className="w-full max-w-md text-center text-neutral-500">Loading...</div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
