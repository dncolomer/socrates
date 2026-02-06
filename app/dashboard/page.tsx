"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSessions, deleteSession, getSessionStats, type Session } from "@/lib/storage";
import { formatTime } from "@/lib/utils";
import { EEGWaveView } from "@/components/EEGWaveView";
import { BrainStateBar } from "@/components/BrainStateBar";
import { DEFAULT_PROMPTS, PROMPT_META, type PromptKey, type UserPrompts } from "@/lib/openrouter";

type Tab = "sessions" | "transcripts" | "devices" | "prompts";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; username?: string } | null>(null);
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

      if (authUser) {
        setUser({ email: authUser.email });

        // Try fetching profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, metadata")
          .eq("id", authUser.id)
          .single();

        if (profile) {
          setUser({
            email: authUser.email,
            username: profile.username || undefined,
          });
          if (profile.metadata?.muse_device_name) {
            setMuseDeviceName(profile.metadata.muse_device_name);
          }
          if (profile.metadata?.prompts) {
            setUserPrompts(profile.metadata.prompts as UserPrompts);
          }
        }

        // Try fetching sessions from Supabase
        const { data: dbSessions } = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false });

        if (dbSessions && dbSessions.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: Session[] = dbSessions.map((s: any) => ({
            id: s.id,
            problem: s.problem,
            startedAt: s.created_at,
            endedAt: s.ended_at,
            durationMs: s.duration_ms || 0,
            status: s.status,
            probes: [],
            hasAudio: !!s.audio_path,
            audioPath: s.audio_path,
            report: s.report,
            reportGeneratedAt: s.report_generated_at,
            metadata: s.metadata || {},
          }));
          setSessions(mapped);
        } else {
          // Fallback to local storage
          const localSessions = getSessions();
          localSessions.sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
          setSessions(localSessions);
        }

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
      } else {
        // No auth - load local sessions
        const localSessions = getSessions();
        localSessions.sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        setSessions(localSessions);
      }
    } catch {
      // Fallback to local storage on any error
      const localSessions = getSessions();
      localSessions.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      setSessions(localSessions);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = (id: string) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    deleteSession(id);
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-white">Socrates</Link>
            <span className="text-neutral-600">|</span>
            <span className="text-sm text-neutral-400">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {user?.email && (
              <span className="text-sm text-neutral-400">{user.email}</span>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm text-neutral-500 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Sessions" value={totalSessions.toString()} />
          <StatCard label="Total Time" value={`${totalMinutes}m`} />
          <StatCard label="Total Probes" value={allProbes.toString()} />
          <StatCard
            label="Avg Gap"
            value={
              sessions.length > 0
                ? `${Math.round(
                    (sessions.reduce((s, sess) => {
                      const stats = getSessionStats(sess);
                      return s + stats.avgGapScore;
                    }, 0) / sessions.length) * 100
                  )}%`
                : "—"
            }
          />
        </div>

        {/* Start New Session */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
          >
            <PlusIcon />
            New Session
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-neutral-900 rounded-lg p-1 w-fit">
          {(["sessions", "transcripts", "devices", "prompts"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${
                activeTab === tab
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-neutral-300"
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
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 mb-6">
              <h3 className="text-white font-semibold mb-2">My Think-Aloud Data</h3>
              <p className="text-neutral-400 text-sm mb-4">
                Upload recordings of yourself thinking through problems. Socrates
                will learn your reasoning patterns and ask better questions.
              </p>

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
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors ${
                  uploading
                    ? "bg-neutral-700 text-neutral-400"
                    : "bg-neutral-800 text-white hover:bg-neutral-700"
                }`}
              >
                <UploadIcon />
                {uploading ? "Uploading..." : "Upload Transcript"}
              </label>
            </div>

            <div className="space-y-3">
              {transcripts.length === 0 ? (
                <EmptyState
                  title="No transcripts uploaded"
                  description="Upload think-aloud transcripts to personalize your Socratic experience."
                />
              ) : (
                transcripts.map((t) => (
                  <div
                    key={t.id}
                    className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white text-sm">{t.filename}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                        <StatusBadge status={t.status} />
                        <span>{t.chunkCount} chunks</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTranscript(t.id)}
                      className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
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
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <h3 className="text-white font-semibold mb-2">Muse EEG Headband</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Connect a Muse Athena, Muse 2, or Muse S headband to record brain
              activity during sessions.
            </p>

            {typeof navigator !== "undefined" && !("bluetooth" in navigator) ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
                Muse integration requires Chrome or Edge browser (Web Bluetooth not supported in this browser).
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connection controls */}
                <div className="flex items-center gap-4">
                  {museStatus === "disconnected" || museStatus === "connecting" ? (
                    <button
                      onClick={handleConnectMuse}
                      disabled={museStatus === "connecting"}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-700 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                      <BluetoothIcon />
                      {museStatus === "connecting" ? "Connecting..." : "Connect Muse"}
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnectMuse}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                      <BluetoothIcon />
                      Disconnect
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        museStatus === "streaming"
                          ? "bg-green-500 animate-pulse"
                          : museStatus === "connected"
                          ? "bg-green-500"
                          : museStatus === "connecting"
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-neutral-600"
                      }`}
                    />
                    <span className="text-sm text-neutral-400 capitalize">{museStatus}</span>
                  </div>

                  {museDeviceName && museStatus !== "disconnected" && (
                    <span className="text-sm text-neutral-500">
                      {museDeviceName}
                    </span>
                  )}
                </div>

                {museError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                    {museError}
                  </div>
                )}

                {museDeviceName && museStatus === "disconnected" && (
                  <p className="text-sm text-neutral-500">
                    Last device: <span className="text-neutral-300">{museDeviceName}</span>
                  </p>
                )}

                {/* Live EEG Waveform */}
                {museStatus === "streaming" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-neutral-500 mb-2">Live EEG — 4 channels at 256 Hz</p>
                      <EEGWaveView
                        channelData={eegChannelData}
                        visibleSamples={512}
                        traceHeight={40}
                        channels={["TP9", "AF7", "AF8", "TP10"]}
                      />
                    </div>

                    {/* Band Powers */}
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Band powers (hover for details)</p>
                      <BrainStateBar
                        powers={bandPowers}
                        isConnected={true}
                      />
                      {!bandPowers && (
                        <p className="text-xs text-neutral-600 mt-1">Waiting for enough samples...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "prompts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">System Prompts</h3>
                <p className="text-neutral-400 text-sm mt-1">
                  Customize how Socrates behaves. Edit any prompt below or reset to defaults.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetAllPrompts}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-lg transition-colors"
                >
                  Reset all to defaults
                </button>
                <button
                  onClick={handleSavePrompts}
                  disabled={promptsSaving}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg transition-colors"
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
                  className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium text-sm">{meta.label}</h4>
                        {isCustomized && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-300">
                            customized
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-xs mt-0.5">{meta.description}</p>
                    </div>
                    {isCustomized && (
                      <button
                        onClick={() => handleResetPrompt(key)}
                        className="text-xs text-neutral-500 hover:text-white transition-colors whitespace-nowrap"
                      >
                        Reset to default
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
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 font-mono leading-relaxed resize-y focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600"
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
    <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/results?id=${session.id}`}
              className="text-lg font-medium text-white hover:text-blue-400 transition-colors line-clamp-2"
            >
              {session.problem}
            </Link>
            {session.status === "ended_by_tutor" && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300">
                Ended by Socrates
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            {new Date(session.startedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
          title="Delete session"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-neutral-800">
        <Stat icon={<ClockIcon />} text={durationFormatted} />
        <Stat icon={<QuestionIcon />} text={`${stats.probeCount} probes`} />
        {stats.avgGapScore > 0 && (
          <Stat icon={<ChartIcon />} text={`Avg gap: ${Math.round(stats.avgGapScore * 100)}%`} />
        )}
        {session.hasAudio && (
          <Stat icon={<MicIcon />} text="Audio saved" className="text-green-400" />
        )}
        {session.report && (
          <Stat icon={<ReportIcon />} text="Report" className="text-blue-400" />
        )}
      </div>
    </div>
  );
}

function Stat({ icon, text, className }: { icon: React.ReactNode; text: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className || "text-neutral-400"}`}>
      {icon}
      <span>{text}</span>
    </div>
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
    <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-neutral-400 text-sm">{description}</p>
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
