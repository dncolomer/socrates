"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AudioRecorder, blobToBase64 } from "@/lib/audio";
import {
  getSession,
  addProbe,
  addProbeToSession,
  endSession,
  saveSession,
  saveSessionAudio,
  saveSessionEEG,
  toggleProbeStarred,
  type Session,
  type Probe,
  type ObserverMode,
  type Frequency,
} from "@/lib/storage";
import { formatTime } from "@/lib/utils";
import { AudioVisualizer, RecordingIndicator } from "./AudioVisualizer";
import { ActiveProbe } from "./ActiveProbe";
import { ObserverControls } from "./ObserverControls";

// Configuration
const ANALYSIS_INTERVALS: Record<Frequency, number> = {
  rare: 15000,
  balanced: 8000,
  frequent: 4000,
};
const COOLDOWN_AFTER_PROBE_MS = 15000;

export function SessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Observer controls
  const [observerMode, setObserverMode] = useState<ObserverMode>("active");
  const [frequency, setFrequency] = useState<Frequency>("balanced");
  const [isMuted, setIsMuted] = useState(false);
  const [muteRemaining, setMuteRemaining] = useState(0);

  // Probes
  const [activeProbe, setActiveProbe] = useState<Probe | null>(null);
  const [viewingProbeIndex, setViewingProbeIndex] = useState<number>(-1);
  const [openingProbeLoading, setOpeningProbeLoading] = useState(false);

  // Session ending / saving
  const [isSaving, setIsSaving] = useState(false);

  // Tutor-end dialog
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endReason, setEndReason] = useState("");

  // Muse EEG
  const [museStatus, setMuseStatus] = useState<"disconnected" | "connecting" | "connected" | "streaming">("disconnected");
  const [museError, setMuseError] = useState<string | null>(null);
  const [eegChannelData, setEegChannelData] = useState<Map<string, number[]>>(new Map());
  const [bandPowers, setBandPowers] = useState<{ delta: number; theta: number; alpha: number; beta: number; gamma: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const museClientRef = useRef<any>(null);
  const eegIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bandIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eegBufferRef = useRef<Map<string, number[]>>(new Map());

  // Refs for interval callbacks
  const recorderRef = useRef<AudioRecorder | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisRef = useRef<NodeJS.Timeout | null>(null);
  const lastProbeTimeRef = useRef(0);
  const muteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const probeContainerRef = useRef<HTMLDivElement | null>(null);
  const observerModeRef = useRef(observerMode);
  const frequencyRef = useRef(frequency);
  const isMutedRef = useRef(isMuted);

  // Keep refs in sync
  useEffect(() => { observerModeRef.current = observerMode; }, [observerMode]);
  useEffect(() => { frequencyRef.current = frequency; }, [frequency]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Scroll probe into view when it changes
  useEffect(() => {
    if (activeProbe && probeContainerRef.current) {
      probeContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeProbe?.id]);

  // Load session on mount from Supabase + fire opening probe early
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = await getSession(sessionId);
      if (cancelled) return;
      if (s) {
        setSession(s);
        sessionRef.current = s;

        // Fire opening probe immediately so it shows before Start
        if (s.probes.length === 0) {
          setOpeningProbeLoading(true);
          try {
            const res = await fetch("/api/opening-probe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ problem: s.problem }),
            });
            if (!cancelled && res.ok) {
              const { probe: probeText } = await res.json();
              const savedProbe = await addProbe(s.id, {
                timestamp: 0,
                gapScore: 0,
                signals: ["opening"],
                text: probeText,
              });
              const updated = addProbeToSession(s, savedProbe);
              setSession(updated);
              sessionRef.current = updated;
              setActiveProbe(savedProbe);
              setViewingProbeIndex(updated.probes.length - 1);
            }
          } catch { /* opening probe is optional */ }
          finally { if (!cancelled) setOpeningProbeLoading(false); }
        } else {
          // Session already has probes (e.g. page refresh) — show the latest
          setActiveProbe(s.probes[s.probes.length - 1]);
          setViewingProbeIndex(s.probes.length - 1);
        }
      } else {
        router.push("/");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sessionId, router]);

  // ---- Muse EEG ----
  const handleConnectMuse = async () => {
    handleDisconnectMuse();
    setMuseStatus("connecting");
    setMuseError(null);
    try {
      const { MuseAthenaClient } = await import("@/lib/muse-athena");
      const muse = new MuseAthenaClient();

      muse.onEEG((sample: { channels: Record<string, number[]> }) => {
        for (const [channelName, samples] of Object.entries(sample.channels)) {
          const existing = eegBufferRef.current.get(channelName) || [];
          existing.push(...samples);
          if (existing.length > 512) {
            eegBufferRef.current.set(channelName, existing.slice(-512));
          } else {
            eegBufferRef.current.set(channelName, existing);
          }
        }
      });

      await muse.connect();
      museClientRef.current = muse;
      setMuseStatus("connected");

      await muse.startStreaming();
      setMuseStatus("streaming");

      eegIntervalRef.current = setInterval(() => {
        setEegChannelData(new Map(eegBufferRef.current));
      }, 100);

      bandIntervalRef.current = setInterval(() => {
        const af7 = eegBufferRef.current.get("AF7");
        const af8 = eegBufferRef.current.get("AF8");
        if (!af7 || af7.length < 256 || !af8 || af8.length < 256) return;
        const powers = computeBandPowers(af7.slice(-256), af8.slice(-256));
        setBandPowers(powers);
      }, 1000);
    } catch (err: unknown) {
      setMuseStatus("disconnected");
      const error = err as Error;
      if (error?.name === "NotFoundError" && error?.message?.includes("cancelled")) return;
      setMuseError(error?.message || "Connection failed.");
    }
  };

  const handleDisconnectMuse = () => {
    if (museClientRef.current) {
      try { museClientRef.current.disconnect(); } catch {}
      museClientRef.current = null;
    }
    if (eegIntervalRef.current) { clearInterval(eegIntervalRef.current); eegIntervalRef.current = null; }
    if (bandIntervalRef.current) { clearInterval(bandIntervalRef.current); bandIntervalRef.current = null; }
    eegBufferRef.current.clear();
    setEegChannelData(new Map());
    setBandPowers(null);
    setMuseStatus("disconnected");
  };

  // ---- Audio Analysis ----
  const analyzeAudio = useCallback(async () => {
    const recorder = recorderRef.current;
    const currentSession = sessionRef.current;

    if (!recorder || !currentSession) return;
    if (observerModeRef.current === "off") return;
    if (isMutedRef.current) return;
    if (Date.now() - lastProbeTimeRef.current < COOLDOWN_AFTER_PROBE_MS) return;

    const recentAudio = recorder.getRecentAudio(15000);
    if (!recentAudio || recentAudio.size < 1000) return;

    setIsAnalyzing(true);

    try {
      const audioBase64 = await blobToBase64(recentAudio);
      const audioFormat = recorder.getAudioFormat();

      const gapRes = await fetch("/api/analyze-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, audioFormat, problem: currentSession.problem }),
      });

      if (!gapRes.ok) return;
      const gapData = await gapRes.json();

      const threshold = observerModeRef.current === "passive" ? 0.7 : 0.5;
      if (gapData.gapScore >= threshold) {
        const probeRes = await fetch("/api/generate-probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem: currentSession.problem,
            transcript: gapData.transcript || "",
            gapScore: gapData.gapScore,
            signals: gapData.signals || [],
            previousProbes: currentSession.probes.map((p) => p.text),
          }),
        });

        if (probeRes.ok) {
          const { probe: probeText } = await probeRes.json();

          // Persist probe to Supabase
          const savedProbe = await addProbe(currentSession.id, {
            timestamp: Date.now() - new Date(currentSession.startedAt).getTime(),
            gapScore: gapData.gapScore,
            signals: gapData.signals || [],
            text: probeText,
          });

          const updatedSession = addProbeToSession(currentSession, savedProbe);
          setSession(updatedSession);
          sessionRef.current = updatedSession;

          setActiveProbe(savedProbe);
          setViewingProbeIndex(updatedSession.probes.length - 1);
          lastProbeTimeRef.current = Date.now();
        }
      }

      // Check if tutor suggests ending
      if (currentSession.probes.length > 3) {
        try {
          const endRes = await fetch("/api/check-session-end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              problem: currentSession.problem,
              probeCount: currentSession.probes.length,
              elapsedMs: Date.now() - new Date(currentSession.startedAt).getTime(),
              recentProbes: currentSession.probes.slice(-3).map((p) => p.text),
            }),
          });
          if (endRes.ok) {
            const endData = await endRes.json();
            if (endData.shouldEnd) {
              setEndReason(endData.reason || "Looks like you've covered enough ground.");
              setShowEndDialog(true);
            }
          }
        } catch { /* silent */ }
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);

      const recorder = new AudioRecorder({ chunkDurationMs: 5000, maxBufferDurationMs: 30000 });
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      analysisRef.current = setInterval(() => {
        analyzeAudio();
      }, ANALYSIS_INTERVALS[frequency]);
    } catch {
      setError("Could not access microphone. Please grant permission and try again.");
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (analysisRef.current) clearInterval(analysisRef.current);

    const recorder = recorderRef.current;
    const fullAudio = recorder?.getFullAudio() ?? null;
    recorder?.stop();
    recorderRef.current = null;

    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
    setIsRecording(false);
    setIsSaving(true);
    if (!session) return;

    const finalSession = endSession(session, elapsedSeconds * 1000);
    finalSession.hasAudio = !!fullAudio;

    // Persist to Supabase
    await saveSession(finalSession);

    // Navigate immediately — audio/EEG saves continue in background
    router.push(`/results?id=${finalSession.id}`);

    // Save audio and EEG in background (non-blocking)
    if (fullAudio) {
      saveSessionAudio(finalSession.id, fullAudio).catch(() => {});
    }

    if (museStatus === "streaming" && eegBufferRef.current.size > 0) {
      const channels: Record<string, number[]> = {};
      for (const [ch, samples] of eegBufferRef.current.entries()) {
        channels[ch] = samples;
      }
      saveSessionEEG(finalSession.id, { channels, bandPowers }, museClientRef.current?.deviceName).catch(() => {});
    }

    handleDisconnectMuse();
  };

  const handleMute = (durationMs: number) => {
    setIsMuted(true);
    setMuteRemaining(durationMs);
    if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
    muteTimerRef.current = setTimeout(() => { setIsMuted(false); setMuteRemaining(0); }, durationMs);
  };

  const [forcingProbe, setForcingProbe] = useState(false);

  const handleForceProbe = useCallback(async () => {
    const recorder = recorderRef.current;
    const currentSession = sessionRef.current;
    if (!recorder || !currentSession || forcingProbe) return;

    setForcingProbe(true);
    try {
      // Get recent audio for transcript context
      const recentAudio = recorder.getRecentAudio(15000);
      let transcript = "";

      if (recentAudio && recentAudio.size > 1000) {
        const audioBase64 = await blobToBase64(recentAudio);
        const audioFormat = recorder.getAudioFormat();
        const gapRes = await fetch("/api/analyze-gap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64, audioFormat, problem: currentSession.problem }),
        });
        if (gapRes.ok) {
          const gapData = await gapRes.json();
          transcript = gapData.transcript || "";
        }
      }

      // Force a probe regardless of gap score
      const probeRes = await fetch("/api/generate-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: currentSession.problem,
          transcript,
          gapScore: 1.0,
          signals: ["user_requested"],
          previousProbes: currentSession.probes.map((p) => p.text),
        }),
      });

      if (probeRes.ok) {
        const { probe: probeText } = await probeRes.json();
        const savedProbe = await addProbe(currentSession.id, {
          timestamp: Date.now() - new Date(currentSession.startedAt).getTime(),
          gapScore: 1.0,
          signals: ["user_requested"],
          text: probeText,
        });
        const updatedSession = addProbeToSession(currentSession, savedProbe);
        setSession(updatedSession);
        sessionRef.current = updatedSession;
        setActiveProbe(savedProbe);
        setViewingProbeIndex(updatedSession.probes.length - 1);
        lastProbeTimeRef.current = Date.now();
      }
    } catch (err) {
      console.error("Force probe error:", err);
    } finally {
      setForcingProbe(false);
    }
  }, [forcingProbe]);

  // Spacebar shortcut to force a probe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only when recording, and not typing in an input/textarea
      if (!isRecording) return;
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      handleForceProbe();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, handleForceProbe]);

  // Probe navigation
  const probeCount = session?.probes.length ?? 0;
  const canGoPrev = viewingProbeIndex > 0;
  const canGoNext = viewingProbeIndex < probeCount - 1;

  const handlePrevProbe = () => {
    if (!session || viewingProbeIndex <= 0) return;
    const newIdx = viewingProbeIndex - 1;
    setViewingProbeIndex(newIdx);
    setActiveProbe(session.probes[newIdx]);
  };

  const handleNextProbe = () => {
    if (!session || viewingProbeIndex >= session.probes.length - 1) return;
    const newIdx = viewingProbeIndex + 1;
    setViewingProbeIndex(newIdx);
    setActiveProbe(session.probes[newIdx]);
  };

  const handleToggleStar = async (probeId: string, starred: boolean) => {
    if (!session) return;

    // Update local state immediately
    const updatedProbes = session.probes.map((p) =>
      p.id === probeId ? { ...p, starred } : p
    );
    const updatedSession = { ...session, probes: updatedProbes };
    setSession(updatedSession);
    sessionRef.current = updatedSession;

    // Update the active probe if it's the one being starred
    if (activeProbe?.id === probeId) {
      setActiveProbe({ ...activeProbe, starred });
    }

    // Persist to DB (non-blocking)
    toggleProbeStarred(probeId, starred).catch(() => {});
  };

  const handleConfirmEnd = async () => {
    setShowEndDialog(false);
    if (session) {
      const finalSession = endSession(session, elapsedSeconds * 1000, "ended_by_tutor");
      setSession(finalSession);
      sessionRef.current = finalSession;
    }
    await stopRecording();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (analysisRef.current) clearInterval(analysisRef.current);
      if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
      handleDisconnectMuse();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session || isSaving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        {isSaving && (
          <p className="text-sm text-neutral-500 animate-pulse">Saving session...</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <header className="border-b border-neutral-800/60 px-3 sm:px-4 py-3 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight shrink-0 hover:text-neutral-300 transition-colors">Socratic Lesson</a>
            <span className="text-neutral-700 shrink-0 hidden sm:inline">&middot;</span>
            <p className="text-xs sm:text-sm text-neutral-500 truncate hidden sm:block">{session.problem}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAnalyzing && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[11px] text-blue-400 hidden sm:inline">Observing</span>
              </div>
            )}
            <div className="text-xs sm:text-sm font-mono text-neutral-300 tabular-nums bg-neutral-900/50 px-2 sm:px-2.5 py-1 rounded-lg border border-neutral-800">
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={`max-w-5xl mx-auto w-full px-3 sm:px-6 overflow-x-hidden ${isRecording ? "flex-1 flex flex-col min-h-0 py-2 gap-2" : "py-4 sm:py-5"}`}>

        {isRecording ? (
          <>
            {/* Question card — fills remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto" ref={probeContainerRef}>
              <ActiveProbe
              probe={activeProbe}
              problem={session.problem}
              isLoading={openingProbeLoading}
              hasPrev={canGoPrev}
              hasNext={canGoNext}
              onPrevProbe={handlePrevProbe}
              onNextProbe={handleNextProbe}
              probePosition={probeCount > 1 ? `${viewingProbeIndex + 1} / ${probeCount}` : undefined}
              onToggleStar={handleToggleStar}
            />
            </div>

            {/* Session controls — pinned to bottom */}
            <div className="shrink-0 flex flex-col">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5 flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Opening question or Audio Visualizer */}
          <div className="mb-3">
            {isRecording ? (
              <AudioVisualizer isRecording={isRecording} stream={stream} />
            ) : (
              <div className="py-2 px-1">
                {openingProbeLoading && (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <p className="text-neutral-500 text-sm italic">Preparing your first question...</p>
                  </div>
                )}
                {activeProbe && !openingProbeLoading && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-medium text-blue-400/70 mb-2">Your starting question</p>
                    <p className="text-white text-base sm:text-lg leading-relaxed">{activeProbe.text}</p>
                    <p className="text-xs text-neutral-500 mt-3">Press <span className="text-neutral-300 font-medium">Start Session</span> below and answer this out loud.</p>
                  </div>
                )}
                {!activeProbe && !openingProbeLoading && (
                  <p className="text-neutral-600 text-sm text-center">Ready to begin</p>
                )}
              </div>
            )}
          </div>

          {/* Status + Controls Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
            <RecordingIndicator isRecording={isRecording} />
            {/* Muse connect / status */}
            {museStatus === "disconnected" || museStatus === "connecting" ? (
              <button
                onClick={handleConnectMuse}
                disabled={museStatus === "connecting"}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded-lg border border-neutral-700 transition-colors"
              >
                <BluetoothIcon />
                {museStatus === "connecting" ? "Connecting..." : "Muse"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] text-green-400">Muse</span>
                </div>
                <button
                  onClick={handleDisconnectMuse}
                  className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
            {isRecording && (
              <div className="w-full sm:w-auto sm:ml-auto">
                <ObserverControls
                  mode={observerMode}
                  frequency={frequency}
                  onModeChange={setObserverMode}
                  onFrequencyChange={setFrequency}
                  onMute={handleMute}
                  isMuted={isMuted}
                  muteRemaining={muteRemaining}
                />
              </div>
            )}
          </div>

          {/* Muse EEG minimal status — just confirm it's recording */}
          {museStatus === "streaming" && isRecording && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800/30 border border-neutral-800/50">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] text-neutral-500">EEG recording</span>
              <span className="text-[11px] text-neutral-700">·</span>
              <span className="text-[11px] text-neutral-600 font-mono">{eegChannelData.size} ch</span>
              {bandPowers && (
                <>
                  <span className="text-[11px] text-neutral-700">·</span>
                  <span className="text-[11px] text-neutral-600">α {(bandPowers.alpha * 100).toFixed(0)}%</span>
                </>
              )}
            </div>
          )}

          {/* Muse EEG channel readiness — only before session starts */}
          {museStatus === "streaming" && !isRecording && (() => {
            const expectedChannels = ["TP9", "AF7", "AF8", "TP10"];
            const detectedChannels = expectedChannels.filter(ch => {
              const samples = eegChannelData.get(ch);
              return samples && samples.length > 0;
            });
            const allReady = detectedChannels.length >= expectedChannels.length;
            return (
              <div className="mb-3 px-3.5 py-3 rounded-lg bg-neutral-800/30 border border-neutral-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expectedChannels.map(ch => {
                      const active = detectedChannels.includes(ch);
                      return (
                        <div key={ch} className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-neutral-700 animate-pulse"}`} />
                          <span className={`text-[11px] font-mono ${active ? "text-green-400" : "text-neutral-600"}`}>{ch}</span>
                        </div>
                      );
                    })}
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${allReady ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-neutral-500 bg-neutral-800/50 border border-neutral-800"}`}>
                    {allReady ? "Ready to go" : `Waiting for channels (${detectedChannels.length}/${expectedChannels.length})`}
                  </span>
                </div>
              </div>
            );
          })()}

          {museError && (
            <div className="mb-3 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-[11px]">
              {museError}
            </div>
          )}

          {/* Start / Stop + Nudge Tutor */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex-1 py-3.5 bg-white hover:bg-neutral-200 text-black font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <MicIcon />
                Start Session
              </button>
            ) : (
              <>
                <button
                  onClick={handleForceProbe}
                  disabled={forcingProbe}
                  className="flex-1 py-3.5 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  title="Press Space to nudge the tutor"
                >
                  {forcingProbe ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  )}
                  Nudge Tutor
                  <kbd className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-700/50 rounded border border-blue-500/30 font-mono hidden sm:inline">Space</kbd>
                </button>
                <button
                  onClick={stopRecording}
                  className="flex-1 py-3.5 bg-red-600/80 hover:bg-red-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <StopIcon />
                  End Session
                </button>
              </>
            )}
          </div>
        </div>
            </div>
          </>
        ) : (
          <>
            {/* Recording Card — pre-session */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 sm:p-8">
          {/* Opening question or Audio Visualizer */}
          <div className="mb-3">
            {openingProbeLoading && (
              <div className="flex items-center gap-3">
                <div className="flex gap-1 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-neutral-500 text-sm italic">Preparing your first question...</p>
              </div>
            )}
            {activeProbe && !openingProbeLoading && (
              <div className="py-4 sm:py-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-blue-400 mb-3">Your starting question</p>
                <p className="text-white text-xl sm:text-2xl font-medium leading-relaxed">{activeProbe.text}</p>
                <p className="text-sm text-neutral-500 mt-4">Press <span className="text-white font-medium">Start Session</span> below and answer this out loud.</p>
              </div>
            )}
            {!activeProbe && !openingProbeLoading && (
              <p className="text-neutral-600 text-sm text-center">Ready to begin</p>
            )}
          </div>

          {/* Status + Controls Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
            <RecordingIndicator isRecording={isRecording} />
            {museStatus === "disconnected" || museStatus === "connecting" ? (
              <button
                onClick={handleConnectMuse}
                disabled={museStatus === "connecting"}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded-lg border border-neutral-700 transition-colors"
              >
                <BluetoothIcon />
                {museStatus === "connecting" ? "Connecting..." : "Muse"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] text-green-400">Muse</span>
                </div>
                <button
                  onClick={handleDisconnectMuse}
                  className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Muse EEG channel readiness — before session */}
          {museStatus === "streaming" && !isRecording && (() => {
            const expectedChannels = ["TP9", "AF7", "AF8", "TP10"];
            const detectedChannels = expectedChannels.filter(ch => {
              const samples = eegChannelData.get(ch);
              return samples && samples.length > 0;
            });
            const allReady = detectedChannels.length >= expectedChannels.length;
            return (
              <div className="mb-3 px-3.5 py-3 rounded-lg bg-neutral-800/30 border border-neutral-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expectedChannels.map(ch => {
                      const active = detectedChannels.includes(ch);
                      return (
                        <div key={ch} className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-neutral-700 animate-pulse"}`} />
                          <span className={`text-[11px] font-mono ${active ? "text-green-400" : "text-neutral-600"}`}>{ch}</span>
                        </div>
                      );
                    })}
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${allReady ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-neutral-500 bg-neutral-800/50 border border-neutral-800"}`}>
                    {allReady ? "Ready to go" : `Waiting for channels (${detectedChannels.length}/${expectedChannels.length})`}
                  </span>
                </div>
              </div>
            );
          })()}

          {museError && (
            <div className="mb-3 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-[11px]">
              {museError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={startRecording}
              className="flex-1 py-3.5 bg-white hover:bg-neutral-200 text-black font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <MicIcon />
              Start Session
            </button>
          </div>

          {/* Data consent disclaimer */}
          <p className="text-[10px] sm:text-[11px] text-neutral-600 text-center mt-4 leading-relaxed px-2">
            By starting this session, you agree to let us collect and use your voice and EEG data for research purposes and improvement of the product.
          </p>
            </div>

          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Tutor-End Dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-base font-semibold text-white mb-2">Tutor suggests ending</h3>
            <p className="text-neutral-400 mb-5 text-sm leading-relaxed">{endReason}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowEndDialog(false)}
                className="flex-1 py-2.5 text-sm text-neutral-400 border border-neutral-700 hover:border-neutral-500 rounded-xl transition-colors"
              >
                Keep going
              </button>
              <button
                onClick={handleConfirmEnd}
                className="flex-1 py-2.5 text-sm text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Band Power Computation ----

function computeBandPowers(af7: number[], af8: number[]) {
  const n = 256;
  const sampleRate = 256;
  const bandRanges: Record<string, [number, number]> = {
    delta: [1, 4], theta: [4, 8], alpha: [8, 13], beta: [13, 30], gamma: [30, 44],
  };

  function channelBands(samples: number[]) {
    const windowed = samples.map((s, i) => s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))));
    const powers: Record<string, number> = {};
    for (const [band, [fLow, fHigh]] of Object.entries(bandRanges)) {
      let power = 0;
      const binLow = Math.floor((fLow * n) / sampleRate);
      const binHigh = Math.min(Math.ceil((fHigh * n) / sampleRate), n / 2);
      for (let k = binLow; k <= binHigh; k++) {
        let re = 0, im = 0;
        for (let j = 0; j < n; j++) {
          const angle = (2 * Math.PI * k * j) / n;
          re += windowed[j] * Math.cos(angle);
          im -= windowed[j] * Math.sin(angle);
        }
        power += (re * re + im * im) / (n * n);
      }
      powers[band] = power;
    }
    return powers;
  }

  const p1 = channelBands(af7.slice(-n));
  const p2 = channelBands(af8.slice(-n));
  const avg: Record<string, number> = {};
  for (const band of Object.keys(bandRanges)) avg[band] = ((p1[band] || 0) + (p2[band] || 0)) / 2;

  const total = Object.values(avg).reduce((s, v) => s + v, 0);
  if (total > 0) for (const band of Object.keys(avg)) avg[band] /= total;

  return { delta: avg.delta || 0, theta: avg.theta || 0, alpha: avg.alpha || 0, beta: avg.beta || 0, gamma: avg.gamma || 0 };
}

// ---- Icons ----

function MicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function ObserverIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function FreqIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function BluetoothIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l10 10-5 5V2l5 5L7 17" />
    </svg>
  );
}
