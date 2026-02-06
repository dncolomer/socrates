"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AudioRecorder, blobToBase64 } from "@/lib/audio";
import {
  getCurrentSession,
  setCurrentSession,
  addProbeToSession,
  endSession,
  saveSession,
  saveSessionAudio,
  type Session,
  type Probe,
  type ObserverMode,
  type Frequency,
} from "@/lib/storage";
import { formatTime } from "@/lib/utils";
import { AudioVisualizer, RecordingIndicator } from "./AudioVisualizer";
import { ObserverControls } from "./ObserverControls";
import { ProbeSidebar } from "./ProbeSidebar";
import { ActiveProbe } from "./ActiveProbe";
import { BrainStateBar, type BandPowers } from "./BrainStateBar";
import { EEGWaveView } from "./EEGWaveView";
import { getMuseManager, isMuseSupported, type MuseManager as MuseManagerType } from "@/lib/muse";

const FREQUENCY_PRESETS: Record<Frequency, { threshold: number; intervalMs: number; cooldownMs: number }> = {
  rare: { threshold: 0.8, intervalMs: 15000, cooldownMs: 30000 },
  balanced: { threshold: 0.6, intervalMs: 8000, cooldownMs: 15000 },
  frequent: { threshold: 0.4, intervalMs: 5000, cooldownMs: 10000 },
};

export function SessionView() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [observerMode, setObserverMode] = useState<ObserverMode>("active");
  const [frequency, setFrequency] = useState<Frequency>("balanced");
  const [isMuted, setIsMuted] = useState(false);
  const [muteEndTime, setMuteEndTime] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newProbeId, setNewProbeId] = useState<string | null>(null);

  const [activeProbe, setActiveProbe] = useState<Probe | null>(null);
  const [openingProbeLoading, setOpeningProbeLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endReason, setEndReason] = useState("");

  const [bandPowers, setBandPowers] = useState<BandPowers | null>(null);
  const [museConnected, setMuseConnected] = useState(false);
  const [museConnecting, setMuseConnecting] = useState(false);
  const [museStreaming, setMuseStreaming] = useState(false);
  const [museError, setMuseError] = useState<string | null>(null);
  const [eegChannelData, setEegChannelData] = useState<Map<string, number[]>>(new Map());

  const museManagerRef = useRef<MuseManagerType | null>(null);

  const isAnalyzingRef = useRef(false);
  const lastProbeTimeRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const observerModeRef = useRef<ObserverMode>("active");
  const frequencyRef = useRef<Frequency>("balanced");
  const isMutedRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const gapScoresRef = useRef<number[]>([]);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { observerModeRef.current = observerMode; }, [observerMode]);
  useEffect(() => { frequencyRef.current = frequency; }, [frequency]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    const currentSession = getCurrentSession();
    if (!currentSession) { router.push("/"); return; }
    setSession(currentSession);
  }, [router]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => { elapsedSecondsRef.current = s + 1; return s + 1; });
      }, 1000);
    } else if (timerRef.current) { clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  useEffect(() => {
    if (isMuted) {
      const timer = setTimeout(() => { setIsMuted(false); setMuteEndTime(0); }, muteEndTime - Date.now());
      return () => clearTimeout(timer);
    }
  }, [isMuted, muteEndTime]);

  const analyzeAudio = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!recorderRef.current || !currentSession || isAnalyzingRef.current) return;
    if (observerModeRef.current === "off" || isMutedRef.current) return;

    const preset = FREQUENCY_PRESETS[frequencyRef.current];
    if (Date.now() - lastProbeTimeRef.current < preset.cooldownMs) return;

    const audioBlob = recorderRef.current.getRecentAudio(30000);
    if (!audioBlob || audioBlob.size < 1000) return;

    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const audioFormat = recorderRef.current.getAudioFormat();

      const analysisRes = await fetch("/api/analyze-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, audioFormat, problem: currentSession.problem }),
      });
      if (!analysisRes.ok) return;
      const analysis = await analysisRes.json();
      gapScoresRef.current.push(analysis.gap_score);

      if (analysis.gap_score >= preset.threshold) {
        const probeRes = await fetch("/api/generate-probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem: currentSession.problem,
            gapScore: analysis.gap_score,
            signals: analysis.signals,
            previousProbes: currentSession.probes.map((p) => p.text),
          }),
        });
        if (!probeRes.ok) return;
        const { probe: probeText } = await probeRes.json();

        const newProbe: Omit<Probe, "id"> = {
          timestamp: elapsedSecondsRef.current * 1000,
          gapScore: analysis.gap_score,
          signals: analysis.signals,
          text: probeText,
        };

        const updatedSession = addProbeToSession(currentSession, newProbe);
        setSession(updatedSession);
        setCurrentSession(updatedSession);
        lastProbeTimeRef.current = Date.now();

        const latestProbe = updatedSession.probes[updatedSession.probes.length - 1];
        setNewProbeId(latestProbe.id);
        setUnreadCount((c) => c + 1);

        // Set as active (front-and-center) probe
        setActiveProbe(latestProbe);
        setTimeout(() => setNewProbeId(null), 3000);
      }

      if (gapScoresRef.current.length % 5 === 0 && elapsedSecondsRef.current > 300) {
        try {
          const endRes = await fetch("/api/check-session-end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              elapsed: formatTime(elapsedSecondsRef.current),
              probeCount: currentSession.probes.length,
              recentScores: gapScoresRef.current.slice(-10),
              problem: currentSession.problem,
            }),
          });
          if (endRes.ok) {
            const endCheck = await endRes.json();
            if (endCheck.should_end) { setEndReason(endCheck.reason); setShowEndDialog(true); }
          }
        } catch {}
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (isRecording && session && observerMode !== "off") {
      const preset = FREQUENCY_PRESETS[frequency];
      analysisRef.current = setInterval(analyzeAudio, preset.intervalMs);
    } else if (analysisRef.current) { clearInterval(analysisRef.current); }
    return () => { if (analysisRef.current) clearInterval(analysisRef.current); };
  }, [isRecording, session, observerMode, frequency, analyzeAudio]);

  const handleMute = (durationMs: number) => { setIsMuted(true); setMuteEndTime(Date.now() + durationMs); };

  const startRecording = async () => {
    try {
      setError(null);
      const recorder = new AudioRecorder({ chunkDurationMs: 5000, maxBufferDurationMs: 60000 });
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);

      // Fire opening probe from Socrates
      if (sessionRef.current) {
        setOpeningProbeLoading(true);
        try {
          const res = await fetch("/api/opening-probe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problem: sessionRef.current.problem }),
          });
          if (res.ok) {
            const { probe: probeText } = await res.json();
            if (probeText && sessionRef.current) {
              const openingProbe: Omit<Probe, "id"> = {
                timestamp: 0,
                gapScore: 0,
                signals: ["opening"],
                text: probeText,
              };
              const updated = addProbeToSession(sessionRef.current, openingProbe);
              setSession(updated);
              setCurrentSession(updated);
              const latest = updated.probes[updated.probes.length - 1];
              setActiveProbe(latest);
            }
          }
        } catch {
          // Opening probe is nice-to-have, don't block session
        } finally {
          setOpeningProbeLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access microphone.");
    }
  };

  const connectMuse = async () => {
    setMuseConnecting(true);
    setMuseError(null);
    try {
      const manager = getMuseManager();
      museManagerRef.current = manager;

      // Listen for band power updates
      manager.onBandPowers((powers) => {
        setBandPowers(powers);
      });

      // Listen for status changes
      manager.onStatusChange((status) => {
        setMuseConnected(status === "connected" || status === "streaming");
        setMuseStreaming(status === "streaming");
      });

      await manager.connect();
      setMuseConnected(true);

      // Start streaming immediately
      await manager.startStreaming(Date.now());
      setMuseStreaming(true);

    } catch (err) {
      const error = err as Error;
      if (error?.name === "NotFoundError" && error?.message?.includes("cancelled")) {
        // User dismissed the BT dialog
        setMuseConnecting(false);
        return;
      }
      setMuseError(error?.message || "Failed to connect Muse");
    } finally {
      setMuseConnecting(false);
    }
  };

  const disconnectMuse = () => {
    if (museManagerRef.current) {
      museManagerRef.current.disconnect();
      museManagerRef.current = null;
    }
    setMuseConnected(false);
    setMuseStreaming(false);
    setBandPowers(null);
    setEegChannelData(new Map());
  };

  // Update EEG channel data for waveform from the MuseManager's buffer
  useEffect(() => {
    if (!museStreaming || !museManagerRef.current) return;

    const interval = setInterval(() => {
      const manager = museManagerRef.current;
      if (!manager) return;

      const { eeg } = manager.getSessionData();
      if (eeg.length === 0) return;

      // Build per-channel rolling buffers from the EEG readings
      const channelMap = new Map<string, number[]>();
      const channelNames = ["TP9", "AF7", "AF8", "TP10", "FPz", "AUX_R", "AUX_L"];

      for (const name of channelNames) {
        channelMap.set(name, []);
      }

      // Take the last ~1024 readings per electrode
      const recentReadings = eeg.slice(-1024);
      for (const reading of recentReadings) {
        const chName = channelNames[reading.electrode];
        if (chName) {
          const existing = channelMap.get(chName)!;
          existing.push(...reading.samples);
          // Keep only last 512 samples for display
          if (existing.length > 512) {
            channelMap.set(chName, existing.slice(-512));
          }
        }
      }

      setEegChannelData(channelMap);
    }, 100); // Update at ~10fps for smooth waveform

    return () => clearInterval(interval);
  }, [museStreaming]);

  // Cleanup Muse on unmount
  useEffect(() => {
    return () => {
      if (museManagerRef.current) {
        museManagerRef.current.disconnect();
      }
    };
  }, []);

  const stopRecording = async (status: "completed" | "ended_by_tutor" = "completed") => {
    if (!recorderRef.current || !session) return;

    const fullAudio = recorderRef.current.getFullAudio();
    recorderRef.current.stop();
    recorderRef.current = null;
    setIsRecording(false);

    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }

    // Stop Muse streaming if active
    if (museManagerRef.current && museStreaming) {
      try { await museManagerRef.current.stopStreaming(); } catch {}
    }

    const finalSession = endSession(session, elapsedSeconds * 1000, status);
    finalSession.hasAudio = !!fullAudio;

    // Include EEG summary in metadata
    const avgBands = museManagerRef.current?.getAverageBandPowers();
    const eegSummary = avgBands ? { delta: avgBands.delta, theta: avgBands.theta, alpha: avgBands.alpha, beta: avgBands.beta, gamma: avgBands.gamma } : null;
    finalSession.metadata = { observerMode, frequency, hasEeg: museConnected, eegSummary };

    saveSession(finalSession);
    setCurrentSession(null);

    if (fullAudio) { try { await saveSessionAudio(finalSession.id, fullAudio); } catch {} }

    try {
      const probesSummary = finalSession.probes
        .map((p, i) => `${i + 1}. [${formatTime(Math.floor(p.timestamp / 1000))}] Gap: ${(p.gapScore * 100).toFixed(0)}% - ${p.text}`)
        .join("\n");

      const reportRes = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: finalSession.problem,
          duration: formatTime(Math.floor(finalSession.durationMs / 1000)),
          probeCount: finalSession.probes.length,
          avgGapScore: finalSession.probes.length > 0
            ? finalSession.probes.reduce((s, p) => s + p.gapScore, 0) / finalSession.probes.length : 0,
          probesSummary,
        }),
      });

      if (reportRes.ok) {
        const { report } = await reportRes.json();
        finalSession.report = report;
        finalSession.reportGeneratedAt = new Date().toISOString();
        saveSession(finalSession);
      }
    } catch {}

    router.push(`/results?id=${finalSession.id}`);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Probes for sidebar = all except the active one
  const sidebarProbes = session.probes.filter((p) => p.id !== activeProbe?.id);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-400 line-clamp-1">{session.problem}</p>
          </div>
          <div className="flex items-center gap-3">
            {isAnalyzing && (
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Observing" />
            )}
            <div className="text-lg font-mono text-white tabular-nums">{formatTime(elapsedSeconds)}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-4 gap-4">

        {/* Active Probe Zone -- front and center */}
        {isRecording && (
          <ActiveProbe
            probe={activeProbe}
            problem={session.problem}
            isLoading={openingProbeLoading}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
          />
        )}

        {/* Audio + EEG + Controls Card */}
        <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
          {/* Visualizer */}
          <div className="mb-3">
            {isRecording ? (
              <AudioVisualizer isRecording={isRecording} stream={stream} />
            ) : (
              <div className="h-12 flex items-center justify-center text-neutral-500 text-sm">
                Ready to begin
              </div>
            )}
          </div>

          {/* Muse EEG Section */}
          {isMuseSupported() && (
            <div className="mt-2">
              {!museConnected && !museStreaming ? (
                <button
                  onClick={connectMuse}
                  disabled={museConnecting}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded-lg transition-colors"
                >
                  <BrainIcon />
                  {museConnecting ? "Connecting..." : "Connect Muse"}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${museStreaming ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                      <span className="text-xs text-neutral-400">
                        {museStreaming ? "EEG streaming" : "Muse connected"}
                      </span>
                    </div>
                    <button
                      onClick={disconnectMuse}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>

                  {museStreaming && (
                    <EEGWaveView
                      channelData={eegChannelData}
                      visibleSamples={512}
                      traceHeight={36}
                      channels={["TP9", "AF7", "AF8", "TP10"]}
                    />
                  )}

                  <BrainStateBar powers={bandPowers} isConnected={museConnected} />
                </div>
              )}

              {museError && (
                <p className="text-xs text-red-400 mt-1">{museError}</p>
              )}
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center justify-between mt-3 mb-3">
            <RecordingIndicator isRecording={isRecording} />
            <ObserverControls
              mode={observerMode}
              frequency={frequency}
              onModeChange={setObserverMode}
              onFrequencyChange={setFrequency}
              onMute={handleMute}
              isMuted={isMuted}
              muteRemaining={isMuted ? muteEndTime - Date.now() : undefined}
            />
          </div>

          {/* Start/Stop */}
          <div className="flex gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <MicIcon />
                Start
              </button>
            ) : (
              <button
                onClick={() => stopRecording("completed")}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <StopIcon />
                End
              </button>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Probe History Sidebar */}
      <ProbeSidebar
        probes={sidebarProbes}
        problem={session.problem}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        unreadCount={unreadCount}
        onMarkAllRead={() => setUnreadCount(0)}
        newProbeId={newProbeId}
      />

      {/* Tutor-End Dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Socrates suggests ending</h3>
            <p className="text-neutral-400 mb-6 text-sm">{endReason}</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEndDialog(false); stopRecording("ended_by_tutor"); }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors text-sm"
              >
                End Now
              </button>
              <button
                onClick={() => setShowEndDialog(false)}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrainIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

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
