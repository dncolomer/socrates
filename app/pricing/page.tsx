"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

interface UserState {
  authenticated: boolean;
  plan: PlanId;
  isAdmin: boolean;
}

export default function PricingPage() {
  const [user, setUser] = useState<UserState | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setUser({ authenticated: false, plan: "free", isAdmin: false });
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, is_admin")
          .eq("id", authUser.id)
          .single();

        setUser({
          authenticated: true,
          plan: (profile?.plan || "free") as PlanId,
          isAdmin: profile?.is_admin ?? false,
        });
      } catch {
        setUser({ authenticated: false, plan: "free", isAdmin: false });
      }
    };
    load();
  }, []);

  const handleCheckout = async (priceType: "regular" | "pro" | "extra_lesson") => {
    if (!user?.authenticated) {
      window.location.href = "/login?redirect=/pricing";
      return;
    }
    setLoadingPlan(priceType);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silent
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planId: PlanId) =>
    user?.authenticated && user.plan === planId;

  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Socratic Lesson
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/coaching" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Coaching
            </Link>
            <Link href="/dashboard" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Open Source Banner */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Open source
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Simple pricing
          </h1>
          <p className="text-neutral-500 text-base max-w-lg mx-auto leading-relaxed">
            Socratic Lesson is free to use and{" "}
            <a
              href="https://github.com/dncolomer/socrates"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-2 transition-colors"
            >
              open source on GitHub
            </a>
            . Self-host it or use the hosted version below.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {/* Free */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col">
            <p className="text-sm text-neutral-400 mb-1">{PLANS.free.name}</p>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-white">$0</span>
              <span className="text-sm text-neutral-600">forever</span>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {PLANS.free.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isCurrentPlan("free") ? (
              <div className="flex flex-col gap-2">
                <div className="w-full py-2.5 text-center text-xs text-neutral-600 border border-neutral-800 rounded-xl">
                  Current plan
                </div>
                <button
                  onClick={() => handleCheckout("extra_lesson")}
                  disabled={loadingPlan === "extra_lesson"}
                  className="w-full py-2.5 text-center text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-xl transition-colors"
                >
                  {loadingPlan === "extra_lesson" ? "Loading..." : "Buy extra session — $1.99"}
                </button>
              </div>
            ) : !user?.authenticated ? (
              <Link
                href="/register"
                className="w-full py-2.5 text-center text-sm text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors block"
              >
                Get started
              </Link>
            ) : null}
          </div>

          {/* Regular */}
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/80 p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-white text-black text-[11px] font-medium rounded-full">
              Popular
            </div>
            <p className="text-sm text-neutral-400 mb-1">{PLANS.regular.name}</p>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-white">$4.99</span>
              <span className="text-sm text-neutral-600">/month</span>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {PLANS.regular.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isCurrentPlan("regular") ? (
              <div className="flex flex-col gap-2">
                <div className="w-full py-2.5 text-center text-xs text-neutral-600 border border-neutral-800 rounded-xl">
                  Current plan
                </div>
                <button
                  onClick={() => handleCheckout("extra_lesson")}
                  disabled={loadingPlan === "extra_lesson"}
                  className="w-full py-2.5 text-center text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-xl transition-colors"
                >
                  {loadingPlan === "extra_lesson" ? "Loading..." : "Buy extra session — $1.99"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleCheckout("regular")}
                disabled={loadingPlan === "regular"}
                className="w-full py-2.5 text-center text-sm font-medium text-black bg-white hover:bg-neutral-200 disabled:opacity-50 rounded-xl transition-colors"
              >
                {loadingPlan === "regular" ? "Loading..." : "Subscribe"}
              </button>
            )}
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col">
            <p className="text-sm text-neutral-400 mb-1">{PLANS.pro.name}</p>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-white">$14.99</span>
              <span className="text-sm text-neutral-600">/month</span>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {PLANS.pro.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isCurrentPlan("pro") ? (
              <div className="w-full py-2.5 text-center text-xs text-neutral-600 border border-neutral-800 rounded-xl">
                {user?.isAdmin ? "Admin — unlimited" : "Current plan"}
              </div>
            ) : (
              <button
                onClick={() => handleCheckout("pro")}
                disabled={loadingPlan === "pro"}
                className="w-full py-2.5 text-center text-sm text-white bg-white/10 hover:bg-white/15 disabled:opacity-50 rounded-xl transition-colors"
              >
                {loadingPlan === "pro" ? "Loading..." : "Subscribe"}
              </button>
            )}
          </div>
        </div>

        {/* FAQ / Extra info */}
        <div className="text-center text-xs text-neutral-700">
          <p>
            All plans include real-time audio analysis and AI-generated session reports.
            Cancel anytime from your Stripe dashboard.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
