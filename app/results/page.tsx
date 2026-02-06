"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getSession,
  getSessionAudio,
  getSessionStats,
  type Session,
} from "@/lib/storage";
import { formatTime } from "@/lib/utils";
import { downloadAudio } from "@/lib/audio";
import { ProbeCard } from "@/components/ProbeCard";
import { Footer } from "@/components/Footer";

function ResultsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");
  const [session, setSession] = useState<Session | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      const s = await getSession(sessionId);
      setSession(s);

      if (s?.hasAudio) {
        const audio = await getSessionAudio(sessionId);
        setAudioBlob(audio);
      }

      setLoading(false);
    };

    loadSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#0a0a0a]">
        <h1 className="text-2xl font-bold text-white mb-4">Session Not Found</h1>
        <p className="text-neutral-500 mb-8 text-sm">
          This session may have been deleted or doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-xl transition-colors"
        >
          Start New Session
        </Link>
      </div>
    );
  }

  const stats = getSessionStats(session);
  const durationFormatted = formatTime(Math.floor(session.durationMs / 1000));
  const eegSummary = session.metadata?.eegSummary;

  const handleDownloadAudio = () => {
    if (audioBlob) {
      const filename = `socrates-${session.id.substring(0, 8)}.webm`;
      downloadAudio(audioBlob, filename);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800/60 px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold text-white tracking-tight hover:text-neutral-300 transition-colors">
              Socrates
            </Link>
            <span className="text-neutral-700">&middot;</span>
            <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Results</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/" className="px-3.5 py-1.5 text-sm bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors">
              New Session
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Topic + Status */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">{session.problem}</h2>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span>
              {new Date(session.startedAt).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {session.status === "ended_by_tutor" && (
              <>
                <span className="text-neutral-800">&middot;</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Ended by Socrates
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Duration" value={durationFormatted} />
          <StatCard label="Probes" value={stats.probeCount.toString()} />
          <StatCard
            label="Avg Gap"
            value={`${Math.round(stats.avgGapScore * 100)}%`}
          />
          <StatCard
            label="Peak Gap"
            value={`${Math.round(stats.peakGapScore * 100)}%`}
          />
        </div>

        {/* Audio Player */}
        {session.hasAudio && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-300">Session Recording</h3>
              <button
                onClick={handleDownloadAudio}
                disabled={!audioBlob}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded-lg border border-neutral-700 transition-colors"
              >
                <DownloadIcon />
                Download
              </button>
            </div>
            {audioBlob && (
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="w-full h-10"
                style={{ filter: "invert(1) hue-rotate(180deg)", opacity: 0.7 }}
              />
            )}
          </div>
        )}

        {/* EEG Summary */}
        {eegSummary && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BrainIcon />
              <h3 className="text-sm font-medium text-neutral-300">Muse EEG Summary</h3>
            </div>

            {/* Band powers bar chart */}
            <div className="grid grid-cols-5 gap-3 mb-4">
              {([
                { key: "delta", label: "Delta", range: "1–4 Hz", desc: "Deep rest", color: "#6366f1" },
                { key: "theta", label: "Theta", range: "4–8 Hz", desc: "Creativity", color: "#8b5cf6" },
                { key: "alpha", label: "Alpha", range: "8–13 Hz", desc: "Relaxed focus", color: "#34d399" },
                { key: "beta", label: "Beta", range: "13–30 Hz", desc: "Active thinking", color: "#fbbf24" },
                { key: "gamma", label: "Gamma", range: "30–44 Hz", desc: "Peak focus", color: "#f472b6" },
              ] as const).map(({ key, label, range, desc, color }) => {
                const value = eegSummary[key] ?? 0;
                const pct = Math.round(value * 100);
                return (
                  <div key={key} className="text-center">
                    {/* Vertical bar */}
                    <div className="h-20 flex items-end justify-center mb-2">
                      <div
                        className="w-6 rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(4, pct * 0.8)}px`,
                          backgroundColor: color,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <p className="text-xs font-medium text-neutral-300">{label}</p>
                    <p className="text-lg font-bold text-white">{pct}%</p>
                    <p className="text-[10px] text-neutral-600">{range}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Interpretation */}
            <div className="p-3 rounded-lg bg-neutral-800/40">
              <EEGInterpretation bands={eegSummary} />
            </div>
          </div>
        )}

        {/* Report */}
        {session.report && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 mb-6">
            <h3 className="text-sm font-medium text-neutral-300 mb-3">Session Report</h3>
            <div
              className="prose prose-sm prose-invert max-w-none text-neutral-400 leading-relaxed text-sm"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(session.report) }}
            />
          </div>
        )}

        {/* Probes Timeline */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-300 mb-4">
            Socratic Timeline
            {session.probes.length > 0 && (
              <span className="ml-2 text-neutral-600 font-normal">
                {session.probes.length} probes
              </span>
            )}
          </h3>

          {session.probes.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-neutral-800">
              <p className="text-sm text-neutral-500 mb-1">No probes in this session.</p>
              <p className="text-xs text-neutral-700">You seemed confident throughout!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {session.probes.map((probe) => (
                <ProbeCard key={probe.id} probe={probe} problem={session.problem} />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center pb-8">
          <Link
            href="/"
            className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Start New Session
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

// ---- Sub-components ----

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-[11px] text-neutral-600 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function EEGInterpretation({ bands }: { bands: Record<string, number> }) {
  const alpha = bands.alpha ?? 0;
  const beta = bands.beta ?? 0;
  const theta = bands.theta ?? 0;
  const gamma = bands.gamma ?? 0;

  const lines: string[] = [];

  if (alpha > 0.25) {
    lines.push("High alpha activity suggests you were in a relaxed, focused state — ideal for learning.");
  } else if (alpha < 0.1) {
    lines.push("Low alpha may indicate stress or high cognitive load during the session.");
  }

  if (beta > 0.3) {
    lines.push("Elevated beta waves show active analytical thinking and engagement.");
  }

  if (theta > 0.25) {
    lines.push("Strong theta activity is associated with creative thinking and insight moments.");
  }

  if (gamma > 0.15) {
    lines.push("Notable gamma presence indicates peak concentration and information processing.");
  }

  if (lines.length === 0) {
    lines.push("Brain wave distribution was balanced across all frequency bands during this session.");
  }

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <p key={i} className="text-[11px] text-neutral-400 leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gm, '<h3 class="text-neutral-200 font-medium mt-4 mb-2 text-sm">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-neutral-200 font-medium mt-5 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-white font-semibold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-neutral-200">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, "<br/>")
    .replace(/^/, '<p class="mb-2">')
    .replace(/$/, "</p>");
}

// ---- Icons ----

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
