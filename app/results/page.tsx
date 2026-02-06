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
      const s = getSession(sessionId);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-bold text-white mb-4">Session Not Found</h1>
        <p className="text-neutral-400 mb-8">
          This session may have been deleted or doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
        >
          Start New Session
        </Link>
      </div>
    );
  }

  const stats = getSessionStats(session);
  const durationFormatted = formatTime(Math.floor(session.durationMs / 1000));

  const handleDownloadAudio = () => {
    if (audioBlob) {
      const filename = `socrates-${session.id.substring(0, 8)}.webm`;
      downloadAudio(audioBlob, filename);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
              &larr; Back to Home
            </Link>
            <h1 className="text-xl font-bold text-white mt-1">Session Results</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Status Badge */}
        {session.status === "ended_by_tutor" && (
          <div className="mb-4 inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm">
            Session ended by Socrates
          </div>
        )}

        {/* Problem Summary */}
        <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 mb-8">
          <h2 className="text-sm font-medium text-neutral-400 mb-2">Problem</h2>
          <p className="text-white">{session.problem}</p>
          <p className="text-sm text-neutral-500 mt-4">
            {new Date(session.startedAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Duration" value={durationFormatted} />
          <StatCard label="Probes" value={stats.probeCount.toString()} />
          <StatCard label="Avg Gap" value={`${Math.round(stats.avgGapScore * 100)}%`} />
          <StatCard label="Peak Gap" value={`${Math.round(stats.peakGapScore * 100)}%`} />
        </div>

        {/* Audio Section */}
        {session.hasAudio && (
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Session Recording</h2>
                <p className="text-sm text-neutral-400 mt-1">Full audio from your session</p>
              </div>
              <button
                onClick={handleDownloadAudio}
                disabled={!audioBlob}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <DownloadIcon />
                Download
              </button>
            </div>
            {audioBlob && (
              <div className="mt-4">
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
              </div>
            )}
          </div>
        )}

        {/* AI Report */}
        {session.report && (
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Session Report</h2>
            <div
              className="prose prose-invert prose-sm max-w-none text-neutral-300"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(session.report) }}
            />
          </div>
        )}

        {/* Socratic Timeline */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Socratic Timeline
            {session.probes.length > 0 && (
              <span className="ml-2 text-sm font-normal text-neutral-400">
                ({session.probes.length} probes)
              </span>
            )}
          </h2>

          {session.probes.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 bg-neutral-900 rounded-2xl border border-neutral-800">
              <p>No probes triggered in this session.</p>
              <p className="text-sm mt-2">Your reasoning was flowing smoothly!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {session.probes.map((probe) => (
                <ProbeCard key={probe.id} probe={probe} problem={session.problem} />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
          >
            Start New Session
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

// Simple markdown to HTML converter for reports
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gm, '<h3 class="text-white font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-white font-semibold text-lg mt-6 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-white font-bold text-xl mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p class="mb-2">')
    .replace(/$/, '</p>');
}
