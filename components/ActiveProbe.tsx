"use client";

import { useState, useEffect, useRef } from "react";
import type { Probe } from "@/lib/storage";

interface ActiveProbeProps {
  probe: Probe | null;
  problem: string;
  isLoading?: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
}

export function ActiveProbe({
  probe,
  problem,
  isLoading = false,
  autoSpeak,
  onToggleAutoSpeak,
}: ActiveProbeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);

  // Animate in when probe changes
  useEffect(() => {
    if (probe) {
      setAnimateIn(false);
      setIsExpanded(false);
      setExpandedContent(null);
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    }
  }, [probe?.id]);

  // Auto-speak new probes
  useEffect(() => {
    if (autoSpeak && probe && probe.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = probe.id;
      speakProbe(probe.text);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probe?.id, autoSpeak]);

  const speakProbe = async (text: string) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);
    try {
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        // TTS not available (e.g. no API key)
        setIsSpeaking(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Loading state -- Socrates is thinking
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-2xl p-6 flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
            <ThinkingDots />
          </div>
          <p className="text-neutral-400 text-sm italic">
            Socrates is formulating an opening question...
          </p>
        </div>
      </div>
    );
  }

  // No probe yet -- listening state
  if (!probe) {
    return (
      <div className="w-full">
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-2xl p-6 flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <ListenIcon />
          </div>
          <p className="text-neutral-500 text-sm">
            Socrates is listening...
          </p>
          <div className="ml-auto">
            <AutoSpeakToggle enabled={autoSpeak} onToggle={onToggleAutoSpeak} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className={`bg-neutral-900 border rounded-2xl p-5 transition-all duration-500 ${
          animateIn
            ? "opacity-100 translate-y-0 border-blue-500/30 shadow-lg shadow-blue-500/5"
            : "opacity-0 translate-y-2 border-neutral-700/50"
        }`}
      >
        {/* Probe content */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
            <QuestionIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-lg leading-relaxed">{probe.text}</p>

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-neutral-700/50">
                {expandLoading ? (
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

            {/* Actions row */}
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={handleExpand}
                className="text-xs text-neutral-500 hover:text-blue-400 transition-colors"
              >
                {isExpanded ? "Collapse" : "Go deeper"}
              </button>

              <button
                onClick={() => speakProbe(probe.text)}
                disabled={isSpeaking}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  isSpeaking
                    ? "text-blue-400"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                title="Read aloud"
              >
                <SpeakerIcon />
                {isSpeaking ? "Speaking..." : "Listen"}
              </button>

              <span className="text-xs text-neutral-600">
                Gap: {Math.round(probe.gapScore * 100)}%
              </span>

              <div className="ml-auto">
                <AutoSpeakToggle enabled={autoSpeak} onToggle={onToggleAutoSpeak} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function AutoSpeakToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${
        enabled
          ? "bg-blue-600/20 text-blue-400"
          : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"
      }`}
      title={enabled ? "Auto-speak on" : "Auto-speak off"}
    >
      {enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
      <span>Auto</span>
    </button>
  );
}

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

function SpeakerIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function SpeakerOnIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
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
