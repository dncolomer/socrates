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

  return (
    <div
      onClick={handleClick}
      className={`p-4 rounded-xl border transition-all duration-500 cursor-pointer hover:border-neutral-500 ${
        isNew
          ? "bg-neutral-700/30 border-neutral-500 animate-fade-in"
          : isExpanded
          ? "bg-neutral-800 border-neutral-600"
          : "bg-neutral-800/50 border-neutral-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
          <QuestionIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white leading-relaxed">{probe.text}</p>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-neutral-700">
              {isLoading ? (
                <div className="flex items-center gap-2 text-neutral-400">
                  <LoadingSpinner />
                  <span className="text-sm">Going deeper...</span>
                </div>
              ) : expandedContent ? (
                <p className="text-neutral-300 text-sm leading-relaxed whitespace-pre-line">
                  {expandedContent}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
            <span>{timestampFormatted}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span>Gap: {Math.round(probe.gapScore * 100)}%</span>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-neutral-400">
              {isExpanded ? "Click to collapse" : "Go deeper"}
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

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
