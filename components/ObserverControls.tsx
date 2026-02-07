"use client";

import { useState, useEffect, useRef } from "react";
import type { ObserverMode, Frequency } from "@/lib/storage";

interface ObserverControlsProps {
  mode: ObserverMode;
  frequency: Frequency;
  onModeChange: (mode: ObserverMode) => void;
  onFrequencyChange: (frequency: Frequency) => void;
  onMute: (durationMs: number) => void;
  isMuted: boolean;
  muteRemaining?: number;
}

const MODE_ICONS: Record<ObserverMode, { icon: React.ReactNode; title: string }> = {
  off: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    title: "Off",
  },
  passive: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Passive",
  },
  active: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Active",
  },
};

const FREQ_ICONS: Record<Frequency, { icon: React.ReactNode; title: string }> = {
  rare: {
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    title: "Rare",
  },
  balanced: {
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    title: "Balanced",
  },
  frequent: {
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16M4 8h16M4 12h16M4 16h16M4 20h16" />
      </svg>
    ),
    title: "Frequent",
  },
};

export function ObserverControls({
  mode,
  frequency,
  onModeChange,
  onFrequencyChange,
  onMute,
  isMuted,
  muteRemaining,
}: ObserverControlsProps) {
  const [muteCountdown, setMuteCountdown] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isMuted && muteRemaining && muteRemaining > 0) {
      const startTime = Date.now();
      const update = () => {
        const remaining = muteRemaining - (Date.now() - startTime);
        if (remaining <= 0) {
          setMuteCountdown("");
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setMuteCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setMuteCountdown("");
    }
  }, [isMuted, muteRemaining]);

  const modes: ObserverMode[] = ["off", "passive", "active"];
  const frequencies: Frequency[] = ["rare", "balanced", "frequent"];

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2 p-2 bg-neutral-800/50 rounded-xl">
        {/* Observer Mode */}
        <div className="flex bg-neutral-900 rounded-lg p-0.5 gap-0.5">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              title={MODE_ICONS[m].title}
              className={`p-2 rounded-md transition-colors ${
                mode === m
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {MODE_ICONS[m].icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-neutral-700" />

        {/* Frequency */}
        <div className="flex bg-neutral-900 rounded-lg p-0.5 gap-0.5">
          {frequencies.map((f) => (
            <button
              key={f}
              onClick={() => onFrequencyChange(f)}
              title={FREQ_ICONS[f].title}
              className={`p-2 rounded-md transition-colors ${
                frequency === f
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {FREQ_ICONS[f].icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-neutral-700" />

        {/* Mute */}
        <button
          onClick={() => onMute(10 * 60 * 1000)}
          disabled={isMuted}
          title={isMuted && muteCountdown ? `Muted ${muteCountdown}` : "Mute 10 min"}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            isMuted
              ? "bg-amber-900/30 text-amber-400"
              : "text-neutral-500 hover:text-white"
          }`}
        >
          <MuteIcon />
          {isMuted && muteCountdown && (
            <span className="text-xs font-mono">{muteCountdown}</span>
          )}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-neutral-600 px-1">
        <span>Off · Passive · <span className="text-neutral-400">Active</span></span>
        <span className="text-neutral-700">|</span>
        <span>Rare · <span className="text-neutral-400">Normal</span> · Frequent</span>
        <span className="text-neutral-700">|</span>
        <span>{isMuted ? "Muted" : "Mute tutor"}</span>
      </div>
    </div>
  );
}

function MuteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}
