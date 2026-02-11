"use client";

import { useState } from "react";
import { formatTime } from "@/lib/utils";
import type { Probe } from "@/lib/storage";

interface ProbeCardProps {
  probe: Probe;
  problem: string;
  isNew?: boolean;
}

export function ProbeCard({ probe, problem, isNew = false }: ProbeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showAskInput, setShowAskInput] = useState(false);
  const [askText, setAskText] = useState("");
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  const timestampFormatted = formatTime(Math.floor(probe.timestamp / 1000));

  const handleClick = async () => {
    if (expandedContent) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
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
        setExpandedContent("Failed to load. Click to try again.");
      }
    } catch {
      setExpandedContent("Failed to load. Click to try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAskInput(!showAskInput);
  };

  const handleAskSubmit = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!askText.trim()) return;

    setAskLoading(true);
    try {
      const res = await fetch("/api/ask-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, probe: probe.text, question: askText.trim() }),
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
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskSubmit();
    }
    if (e.key === "Escape") setShowAskInput(false);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 rounded-xl border transition-all duration-500 cursor-pointer hover:border-neutral-500 ${
        isNew
          ? "bg-neutral-700/30 border-neutral-500 animate-fade-in"
          : probe.starred
          ? isExpanded
            ? "bg-amber-500/5 border-amber-500/40"
            : "bg-amber-500/[0.03] border-amber-500/25 hover:border-amber-500/40"
          : isExpanded
          ? "bg-neutral-800 border-neutral-600"
          : "bg-neutral-800/50 border-neutral-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          probe.starred ? "bg-amber-500/15" : "bg-neutral-700"
        }`}>
          {probe.starred ? <StarFilledIcon /> : <QuestionIcon />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className="text-white leading-relaxed flex-1">{probe.text}</p>
            {probe.starred && (
              <span className="shrink-0 mt-1 px-1.5 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                Starred
              </span>
            )}
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-neutral-700">
              {isLoading ? (
                <div className="flex items-center gap-2 text-neutral-400">
                  <LoadingSpinner />
                  <span className="text-sm">Going deeper...</span>
                </div>
              ) : expandedContent ? (
                <div className="border-l-2 border-blue-500/50 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Go Deeper</span>
                  </div>
                  <p className="text-blue-100/90 text-sm leading-relaxed whitespace-pre-line">
                    {expandedContent}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Ask response */}
          {askResponse && (
            <div className="mt-3 pt-3 border-t border-neutral-700" onClick={(e) => e.stopPropagation()}>
              <div className="border-l-2 border-emerald-500/50 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Answer</span>
                </div>
                <p className="text-emerald-100/90 text-sm leading-relaxed whitespace-pre-line">
                  {askResponse}
                </p>
              </div>
            </div>
          )}

          {/* Ask input */}
          {showAskInput && (
            <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onKeyDown={handleAskKeyDown}
                placeholder="Type your question..."
                disabled={askLoading}
                className="flex-1 bg-neutral-800/80 border border-neutral-700/60 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={handleAskSubmit}
                disabled={askLoading || !askText.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 hover:border-emerald-500/50"
              >
                {askLoading ? <><LoadingSpinner /><span>Thinking...</span></> : <><SendIcon /><span>Send</span></>}
              </button>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span>{timestampFormatted}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span>Gap: {Math.round(probe.gapScore * 100)}%</span>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-neutral-400">
              {isExpanded ? "Click to collapse" : "Go deeper"}
            </span>
            <span
              className={`cursor-pointer transition-colors ${showAskInput ? "text-emerald-400" : "text-neutral-400 hover:text-emerald-400"}`}
              onClick={handleAskToggle}
            >
              Ask
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StarFilledIcon() {
  return (
    <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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

function SendIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
