"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSessions, deleteSession, getSessionStats, type Session } from "@/lib/storage";
// All storage is now Supabase-only (no localStorage fallback)
import { formatTime } from "@/lib/utils";
import { EEGWaveView } from "@/components/EEGWaveView";
import { BrainStateBar } from "@/components/BrainStateBar";
import { DEFAULT_PROMPTS, PROMPT_META, type PromptKey, type UserPrompts } from "@/lib/openrouter";

type Tab = "sessions" | "transcripts" | "devices" | "prompts";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; username?: string; plan?: string; isAdmin?: boolean; extraLessons?: number; sessionsThisMonth?: number } | null>(null);
  const [buyingExtra, setBuyingExtra] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("sessions");

  // Transcripts
  const [transcripts, setTranscripts] = useState<TranscriptFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Muse
  const [museStatus, setMuseStatus] = useState<"disconnected" | "connecting" | "connected" | "streaming">("disconnected");
  const [museDeviceName, setMuseDeviceName] = useState<string | null>(null);
  const [museError, setMuseError] = useState<string | null>(null);
  const [eegChannelData, setEegChannelData] = useState<Map<string, number[]>>(new Map());
  const [bandPowers, setBandPowers] = useState<{ delta: number; theta: number; alpha: number; beta: number; gamma: number } | null>(null);
  const museClientRef = useRef<InstanceType<typeof import("@/lib/muse-athena").MuseAthenaClient> | null>(null);
  const eegIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bandIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eegBufferRef = useRef<Map<string, number[]>>(new Map());

  // Prompts
  const [userPrompts, setUserPrompts] = useState<UserPrompts>({});
  const [promptsSaving, setPromptsSaving] = useState(false);
  const [promptsSaved, setPromptsSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        // Dashboard requires auth — redirect
        router.push("/login");
        return;
      }

      setUser({ email: authUser.email });

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, metadata, plan, is_admin, extra_lessons")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser({
          email: authUser.email,
          username: profile.username || undefined,
          plan: profile.plan || "free",
          isAdmin: profile.is_admin || false,
          extraLessons: profile.extra_lessons || 0,
        });
        if (profile.metadata?.muse_device_name) {
          setMuseDeviceName(profile.metadata.muse_device_name);
        }
        if (profile.metadata?.prompts) {
          setUserPrompts(profile.metadata.prompts as UserPrompts);
        }
      }

      // Load sessions from Supabase (with probes)
      const loadedSessions = await getSessions();
      setSessions(loadedSessions);

      // Load transcripts
      const { data: ts } = await supabase
        .from("user_transcripts")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      if (ts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTranscripts(ts.map((t: any) => ({
          id: t.id,
          filename: t.filename,
          status: t.status,
          chunkCount: t.chunk_count,
          createdAt: t.created_at,
        })));
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleUploadTranscript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const transcriptId = crypto.randomUUID();
      const filePath = `${authUser.id}/${transcriptId}.txt`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("user-transcripts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create DB entry
      const { error: dbError } = await supabase
        .from("user_transcripts")
        .insert({
          id: transcriptId,
          user_id: authUser.id,
          filename: file.name,
          file_path: filePath,
          status: "pending",
        });

      if (dbError) throw dbError;

      // Process transcript
      await fetch("/api/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });

      loadData();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteTranscript = async (id: string) => {
    if (!confirm("Delete this transcript?")) return;
    try {
      const supabase = createClient();
      await supabase.from("user_transcripts").delete().eq("id", id);
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  const handleConnectMuse = async () => {
    // Disconnect any existing connection first
    handleDisconnectMuse();

    setMuseStatus("connecting");
    setMuseError(null);
    try {
      const { MuseAthenaClient, EEG_CHANNELS } = await import("@/lib/muse-athena");
      const muse = new MuseAthenaClient();

      // Subscribe to EEG data for waveform
      muse.onEEG((sample) => {
        for (const [channelName, samples] of Object.entries(sample.channels)) {
          const existing = eegBufferRef.current.get(channelName) || [];
          existing.push(...samples);
          // Keep last 512 samples (~2s at 256Hz)
          if (existing.length > 512) {
            eegBufferRef.current.set(channelName, existing.slice(-512));
          } else {
            eegBufferRef.current.set(channelName, existing);
          }
        }
      });

      await muse.connect();
      museClientRef.current = muse;
      const name = muse.deviceName || "Muse Device";
      setMuseDeviceName(name);
      setMuseStatus("connected");

      // Save device name to profile
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase
          .from("profiles")
          .update({ metadata: { muse_device_name: name } })
          .eq("id", authUser.id);
      }

      // Start streaming
      await muse.startStreaming();
      setMuseStatus("streaming");

      // Poll EEG buffer to update React state for waveform rendering (~10fps)
      eegIntervalRef.current = setInterval(() => {
        setEegChannelData(new Map(eegBufferRef.current));
      }, 100);

      // Compute band powers from the raw EEG samples every second
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
      if (error?.name === "NotFoundError" && error?.message?.includes("cancelled")) {
        return;
      }
      setMuseError(error?.message || "Connection failed. Make sure your Muse is powered on and in pairing mode.");
    }
  };

  const handleDisconnectMuse = () => {
    if (museClientRef.current) {
      try { museClientRef.current.disconnect(); } catch {}
      museClientRef.current = null;
    }
    if (eegIntervalRef.current) {
      clearInterval(eegIntervalRef.current);
      eegIntervalRef.current = null;
    }
    if (bandIntervalRef.current) {
      clearInterval(bandIntervalRef.current);
      bandIntervalRef.current = null;
    }
    eegBufferRef.current.clear();
    setEegChannelData(new Map());
    setBandPowers(null);
    setMuseStatus("disconnected");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleDisconnectMuse();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePrompts = async () => {
    setPromptsSaving(true);
    setPromptsSaved(false);
    try {
      const res = await fetch("/api/save-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: userPrompts }),
      });
      if (res.ok) {
        setPromptsSaved(true);
        setTimeout(() => setPromptsSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setPromptsSaving(false);
    }
  };

  const handleResetPrompt = (key: PromptKey) => {
    setUserPrompts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleResetAllPrompts = () => {
    setUserPrompts({});
  };

  const handleBuyExtraLesson = async () => {
    setBuyingExtra(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType: "extra_lesson" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Buy extra lesson error:", err);
    } finally {
      setBuyingExtra(false);
    }
  };

  // Compute aggregate stats
  const totalSessions = sessions.length;
  const totalMinutes = Math.round(sessions.reduce((s, sess) => s + sess.durationMs, 0) / 60000);
  const allProbes = sessions.reduce((s, sess) => s + sess.probes.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800/60 px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold text-white tracking-tight">Socrates</Link>
            <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-neutral-500 hover:text-white transition-colors">
              Pricing
            </Link>
            {user && (
              <span className="text-sm text-neutral-500">
                {user.username || user.email}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-neutral-600 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Stats + New Session Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] text-neutral-600 uppercase tracking-wider">Sessions</p>
              <p className="text-2xl font-bold text-white">{totalSessions}</p>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div>
              <p className="text-[11px] text-neutral-600 uppercase tracking-wider">Time</p>
              <p className="text-2xl font-bold text-white">{totalMinutes}m</p>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div>
              <p className="text-[11px] text-neutral-600 uppercase tracking-wider">Probes</p>
              <p className="text-2xl font-bold text-white">{allProbes}</p>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div>
              <p className="text-[11px] text-neutral-600 uppercase tracking-wider">Avg Gap</p>
              <p className="text-2xl font-bold text-white">
                {sessions.length > 0
                  ? `${Math.round(
                      (sessions.reduce((s, sess) => {
                        const stats = getSessionStats(sess);
                        return s + stats.avgGapScore;
                      }, 0) / sessions.length) * 100
                    )}%`
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Plan badge + Buy extra */}
            {user && !user.isAdmin && user.plan !== "pro" && (
              <button
                onClick={handleBuyExtraLesson}
                disabled={buyingExtra}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-amber-400 border border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5 disabled:opacity-50 rounded-lg transition-colors"
              >
                <BoltIcon />
                {buyingExtra ? "Redirecting..." : "Buy extra lesson — $1.99"}
              </button>
            )}
            {user && (
              <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-medium rounded-md border ${
                user.isAdmin
                  ? "text-purple-400 border-purple-500/30 bg-purple-500/10"
                  : user.plan === "pro"
                  ? "text-green-400 border-green-500/30 bg-green-500/10"
                  : user.plan === "regular"
                  ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
                  : "text-neutral-500 border-neutral-700 bg-neutral-800/50"
              }`}>
                {user.isAdmin ? "Admin" : user.plan || "Free"}
              </span>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <PlusIcon />
              New Session
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {(["sessions", "transcripts", "devices", "prompts"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3.5 py-1.5 text-xs rounded-full border transition-colors capitalize ${
                activeTab === tab
                  ? "bg-white text-black border-white"
                  : "text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-white"
              }`}
            >
              {tab === "transcripts" ? "Think-Aloud Data" : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <EmptyState
                title="No sessions yet"
                description="Start your first Socratic session to see it here."
              />
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onDelete={() => handleDeleteSession(session.id)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "transcripts" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-neutral-400">
                  Upload recordings of yourself thinking through problems. Socrates
                  will learn your reasoning patterns.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                onChange={handleUploadTranscript}
                className="hidden"
                id="transcript-upload"
              />
              <label
                htmlFor="transcript-upload"
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                  uploading
                    ? "bg-neutral-800 text-neutral-500"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                <UploadIcon />
                {uploading ? "Uploading..." : "Upload"}
              </label>
            </div>

            <div className="space-y-2">
              {transcripts.length === 0 ? (
                <EmptyState
                  title="No transcripts uploaded"
                  description="Upload think-aloud transcripts to personalize your Socratic experience."
                />
              ) : (
                transcripts.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-neutral-700 transition-all duration-200"
                  >
                    <div>
                      <p className="text-sm text-neutral-200">{t.filename}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-600">
                        <StatusBadge status={t.status} />
                        <span>{t.chunkCount} chunks</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTranscript(t.id)}
                      className="p-1.5 text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "devices" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-neutral-400">
                Connect a Muse EEG headband to record brain activity during sessions.
              </p>
              {museStatus === "disconnected" || museStatus === "connecting" ? (
                <button
                  onClick={handleConnectMuse}
                  disabled={museStatus === "connecting"}
                  className="shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <BluetoothIcon />
                  {museStatus === "connecting" ? "Connecting..." : "Connect Muse"}
                </button>
              ) : (
                <button
                  onClick={handleDisconnectMuse}
                  className="shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs text-neutral-400 border border-neutral-700 hover:border-neutral-500 hover:text-white rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            {typeof navigator !== "undefined" && !("bluetooth" in navigator) ? (
              <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-400/80 text-xs">
                Web Bluetooth not supported in this browser. Use Chrome or Edge.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status bar */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      museStatus === "streaming"
                        ? "bg-green-500 animate-pulse"
                        : museStatus === "connected"
                        ? "bg-green-500"
                        : museStatus === "connecting"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-neutral-700"
                    }`}
                  />
                  <span className="text-xs text-neutral-400 capitalize">{museStatus}</span>
                  {museDeviceName && museStatus !== "disconnected" && (
                    <>
                      <span className="text-neutral-800">·</span>
                      <span className="text-xs text-neutral-500">{museDeviceName}</span>
                    </>
                  )}
                  {museDeviceName && museStatus === "disconnected" && (
                    <span className="text-xs text-neutral-600">
                      Last: {museDeviceName}
                    </span>
                  )}
                </div>

                {museError && (
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs">
                    {museError}
                  </div>
                )}

                {/* Live EEG Waveform */}
                {museStatus === "streaming" && (
                  <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <div>
                      <p className="text-[11px] text-neutral-600 mb-2">Live EEG — 4 channels at 256 Hz</p>
                      <EEGWaveView
                        channelData={eegChannelData}
                        visibleSamples={512}
                        traceHeight={40}
                        channels={["TP9", "AF7", "AF8", "TP10"]}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-neutral-600 mb-1">Band powers</p>
                      <BrainStateBar powers={bandPowers} isConnected={true} />
                      {!bandPowers && (
                        <p className="text-[11px] text-neutral-700 mt-1">Waiting for enough samples...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "prompts" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-400">
                Customize how Socrates behaves. Edit any prompt below or reset to defaults.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetAllPrompts}
                  className="px-3 py-1.5 text-xs text-neutral-500 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-lg transition-colors"
                >
                  Reset all
                </button>
                <button
                  onClick={handleSavePrompts}
                  disabled={promptsSaving}
                  className="px-3.5 py-1.5 text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {promptsSaving ? "Saving..." : promptsSaved ? "Saved!" : "Save changes"}
                </button>
              </div>
            </div>

            {(Object.keys(DEFAULT_PROMPTS) as PromptKey[]).map((key) => {
              const meta = PROMPT_META[key];
              const isCustomized = key in userPrompts && userPrompts[key] !== undefined;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
                >
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm text-neutral-200 font-medium">{meta.label}</h4>
                        {isCustomized && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            customized
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5">{meta.description}</p>
                    </div>
                    {isCustomized && (
                      <button
                        onClick={() => handleResetPrompt(key)}
                        className="text-[11px] text-neutral-600 hover:text-white transition-colors whitespace-nowrap"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <textarea
                    value={userPrompts[key] ?? DEFAULT_PROMPTS[key]}
                    onChange={(e) =>
                      setUserPrompts((prev) => ({
                        ...prev,
                        [key]: e.target.value === DEFAULT_PROMPTS[key] ? undefined : e.target.value,
                      }))
                    }
                    rows={8}
                    spellCheck={false}
                    className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 font-mono leading-relaxed resize-y focus:outline-none focus:border-neutral-600 placeholder:text-neutral-700"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

interface TranscriptFile {
  id: string;
  filename: string;
  status: string;
  chunkCount: number;
  createdAt: string;
}

function SessionCard({ session, onDelete }: { session: Session; onDelete: () => void }) {
  const stats = getSessionStats(session);
  const durationFormatted = formatTime(Math.floor(session.durationMs / 1000));

  return (
    <div className={`group p-4 rounded-xl border transition-all duration-200 ${
      session.status === "active"
        ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40"
        : "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-neutral-700"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={session.status === "active" ? `/session?id=${session.id}` : `/results?id=${session.id}`}
              className="text-[15px] font-medium text-neutral-200 group-hover:text-white transition-colors line-clamp-1"
            >
              {session.problem}
            </Link>
            {session.status === "active" && (
              <span className="text-[11px] text-blue-400">— tap to resume</span>
            )}
            {session.status === "ended_by_tutor" && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                Ended by Socrates
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600">
            <span>
              {new Date(session.startedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-neutral-800">·</span>
            <span>{durationFormatted}</span>
            <span className="text-neutral-800">·</span>
            <span>{stats.probeCount} probes</span>
            {stats.avgGapScore > 0 && (
              <>
                <span className="text-neutral-800">·</span>
                <span>Gap {Math.round(stats.avgGapScore * 100)}%</span>
              </>
            )}
            {session.report && (
              <>
                <span className="text-neutral-800">·</span>
                <span className="text-blue-500">Report</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete session"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, text, className }: { icon: React.ReactNode; text: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${className || "text-neutral-500"}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    processing: "bg-blue-500/20 text-blue-300",
    ready: "bg-green-500/20 text-green-300",
    error: "bg-red-500/20 text-red-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || "bg-neutral-700 text-neutral-300"}`}>
      {status}
    </span>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 rounded-xl border border-dashed border-neutral-800">
      <p className="text-sm text-neutral-500 mb-1">{title}</p>
      <p className="text-xs text-neutral-700">{description}</p>
    </div>
  );
}

// ---- Band Power Computation (simple DFT for dashboard preview) ----

function computeBandPowers(af7: number[], af8: number[]) {
  const n = 256;
  const sampleRate = 256;

  const bandRanges: Record<string, [number, number]> = {
    delta: [1, 4],
    theta: [4, 8],
    alpha: [8, 13],
    beta: [13, 30],
    gamma: [30, 44],
  };

  function channelBands(samples: number[]) {
    // Hanning window
    const windowed = samples.map((s, i) =>
      s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)))
    );

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
  for (const band of Object.keys(bandRanges)) {
    avg[band] = ((p1[band] || 0) + (p2[band] || 0)) / 2;
  }

  // Normalize to relative powers
  const total = Object.values(avg).reduce((s, v) => s + v, 0);
  if (total > 0) {
    for (const band of Object.keys(avg)) {
      avg[band] /= total;
    }
  }

  return {
    delta: avg.delta || 0,
    theta: avg.theta || 0,
    alpha: avg.alpha || 0,
    beta: avg.beta || 0,
    gamma: avg.gamma || 0,
  };
}

// ---- Icons ----

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

function ReportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function BluetoothIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l10 10-5 5V2l5 5L7 17" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
