"use client";

import { useState, useEffect, useRef } from "react";
import type { Probe } from "@/lib/storage";

interface ActiveProbeProps {
  probe: Probe | null;
  problem: string;
  isLoading?: boolean;
  // Probe navigation
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrevProbe?: () => void;
  onNextProbe?: () => void;
  probePosition?: string; // e.g. "2 / 5"
  // Star
  onToggleStar?: (probeId: string, starred: boolean) => void;
}

export function ActiveProbe({
  probe,
  problem,
  isLoading = false,
  hasPrev = false,
  hasNext = false,
  onPrevProbe,
  onNextProbe,
  probePosition,
  onToggleStar,
}: ActiveProbeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [flashPulse, setFlashPulse] = useState(false);
  const prevProbeIdRef = useRef<string | null>(null);

  // Ask state
  const [showAskInput, setShowAskInput] = useState(false);
  const [askText, setAskText] = useState("");
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const askInputRef = useRef<HTMLInputElement>(null);

  // Animate in when probe changes
  useEffect(() => {
    if (probe) {
      const isNewProbe = prevProbeIdRef.current !== null && prevProbeIdRef.current !== probe.id;
      prevProbeIdRef.current = probe.id;

      setAnimateIn(false);
      setIsExpanded(false);
      setExpandedContent(null);
      setShowAskInput(false);
      setAskText("");
      setAskResponse(null);

      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });

      // Flash pulse for new probes (not the initial one)
      if (isNewProbe) {
        setFlashPulse(true);
        const timer = setTimeout(() => setFlashPulse(false), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [probe?.id]);

  const handleExpand = async () => {
    if (!probe) return;

    if (expandedContent) {
      setIsExpanded(!isExpanded);
      return;
    }

    setExpandLoading(true);
    setIsExpanded(true);

    try {
      const res = await fetch("/api/expand-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, probe: probe.text }),
      });

      if (res.ok) {
        const { expanded } = await res.json();
        setExpandedContent(expanded);
      } else {
        setExpandedContent("Could not expand. Click to retry.");
      }
    } catch {
      setExpandedContent("Could not expand. Click to retry.");
    } finally {
      setExpandLoading(false);
    }
  };

  const handleAskToggle = () => {
    setShowAskInput(!showAskInput);
    if (!showAskInput) {
      // Focus input after it renders
      setTimeout(() => askInputRef.current?.focus(), 50);
    }
  };

  const handleAskSubmit = async () => {
    if (!probe || !askText.trim()) return;

    setAskLoading(true);
    try {
      const res = await fetch("/api/ask-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem,
          probe: probe.text,
          question: askText.trim(),
        }),
      });

      if (res.ok) {
        const { answer } = await res.json();
        setAskResponse(answer);
        setShowAskInput(false);
      } else {
        setAskResponse("Could not get an answer. Please try again.");
      }
    } catch {
      setAskResponse("Could not get an answer. Please try again.");
    } finally {
      setAskLoading(false);
    }
  };

  const handleAskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskSubmit();
    }
    if (e.key === "Escape") {
      setShowAskInput(false);
    }
  };

  // Loading state -- tutor is thinking
  if (isLoading) {
    return (
      <div className="w-full h-full">
        <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-2xl p-6 h-full flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
            <ThinkingDots />
          </div>
          <p className="text-neutral-400 text-sm italic">
            Your tutor is formulating an opening question...
          </p>
        </div>
      </div>
    );
  }

  // No probe yet -- listening state
  if (!probe) {
    return (
      <div className="w-full h-full">
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-2xl p-6 h-full flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <ListenIcon />
          </div>
          <p className="text-neutral-500 text-sm">
            Your tutor is listening...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Full-width flash overlay on new probe */}
      {flashPulse && (
        <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-probe-flash pointer-events-none z-10" />
      )}
      <div
        className={`bg-neutral-900 border rounded-2xl p-4 sm:p-5 h-full flex flex-col transition-all duration-500 ${
          animateIn
            ? flashPulse
              ? "opacity-100 translate-y-0 border-blue-400/60 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.01]"
              : "opacity-100 translate-y-0 border-blue-500/30 shadow-lg shadow-blue-500/5"
            : "opacity-0 translate-y-4 border-neutral-700/50"
        }`}
        style={{ transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* New question badge */}
        {flashPulse && (
          <div className="flex items-center gap-2 mb-3 animate-probe-badge">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">New question</span>
          </div>
        )}
        {/* Probe content */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-700 ${
            flashPulse ? "bg-blue-600/40 scale-110" : "bg-blue-600/20"
          }`}>
            <QuestionIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-base sm:text-lg leading-relaxed break-words">{probe.text}</p>

            {/* Go deeper expanded content -- BLUE accent */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-neutral-700/50">
                {expandLoading ? (
                  <div className="flex items-center gap-2 text-blue-400">
                    <LoadingSpinner />
                    <span className="text-sm">Going deeper...</span>
                  </div>
                ) : expandedContent ? (
                  <div className="border-l-2 border-blue-500/50 pl-3 sm:pl-4 max-h-[40vh] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Go Deeper</span>
                    </div>
                    <p className="text-blue-100/90 text-sm leading-relaxed whitespace-pre-line break-words">
                      {expandedContent}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Ask response -- EMERALD/GREEN accent */}
            {askResponse && (
              <div className="mt-4 pt-4 border-t border-neutral-700/50">
                <div className="border-l-2 border-emerald-500/50 pl-3 sm:pl-4 max-h-[40vh] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Answer</span>
                  </div>
                  <p className="text-emerald-100/90 text-sm leading-relaxed whitespace-pre-line break-words">
                    {askResponse}
                  </p>
                </div>
              </div>
            )}

            {/* Ask input bar */}
            {showAskInput && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={askInputRef}
                  type="text"
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  onKeyDown={handleAskKeyDown}
                  placeholder="Type your question..."
                  disabled={askLoading}
                  className="flex-1 min-w-0 bg-neutral-800/80 border border-neutral-700/60 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={handleAskSubmit}
                  disabled={askLoading || !askText.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 hover:border-emerald-500/50"
                >
                  {askLoading ? (
                    <>
                      <LoadingSpinner />
                      <span className="hidden sm:inline">Thinking...</span>
                    </>
                  ) : (
                    <>
                      <SendIcon />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Actions row */}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Go deeper -- highlighted button */}
              <button
                onClick={handleExpand}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-blue-600/15 text-blue-400 border border-blue-500/30 hover:bg-blue-600/25 hover:border-blue-500/50 hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
              >
                <DeeperIcon />
                {isExpanded ? "Collapse" : "Go deeper"}
              </button>

              {/* Ask button */}
              <button
                onClick={handleAskToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  showAskInput
                    ? "bg-emerald-600/25 text-emerald-400 border-emerald-500/50"
                    : "bg-emerald-600/10 text-emerald-400/80 border-emerald-500/20 hover:bg-emerald-600/20 hover:border-emerald-500/40 hover:text-emerald-400"
                }`}
              >
                <AskIcon />
                Ask
              </button>

              {/* Star button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar?.(probe.id, !probe.starred);
                }}
                className={`p-2 sm:p-1.5 rounded-md transition-all ${
                  probe.starred
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-neutral-600 hover:text-amber-400 hover:bg-neutral-800"
                }`}
                title={probe.starred ? "Unstar this question" : "Star this question"}
              >
                <StarIcon filled={!!probe.starred} />
              </button>

              {/* Probe navigation */}
              {(hasPrev || hasNext) && (
                <div className="flex items-center gap-0.5 rounded-lg border border-neutral-600/60 bg-neutral-800/60 px-1.5 py-1">
                  <button
                    onClick={onPrevProbe}
                    disabled={!hasPrev}
                    className={`p-1 rounded transition-all disabled:opacity-25 disabled:cursor-default ${
                      hasPrev ? "text-neutral-200 hover:text-white hover:bg-neutral-700" : "text-neutral-600"
                    }`}
                    title="Previous question"
                  >
                    <ChevronLeftIcon />
                  </button>
                  {probePosition && (
                    <span className="text-xs font-medium text-neutral-200 tabular-nums min-w-[2.5rem] text-center">
                      {probePosition}
                    </span>
                  )}
                  <button
                    onClick={onNextProbe}
                    disabled={!hasNext}
                    className={`p-1 rounded transition-all disabled:opacity-25 disabled:cursor-default ${
                      hasNext ? "text-neutral-200 hover:text-white hover:bg-neutral-700" : "text-neutral-600"
                    }`}
                    title="Next question"
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              )}

              <span className="text-xs text-neutral-600">
                Gap: {Math.round(probe.gapScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function ThinkingDots() {
  return (
    <div className="flex gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// ---- Icons ----

function QuestionIcon() {
  return (
    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ListenIcon() {
  return (
    <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function DeeperIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

function AskIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
