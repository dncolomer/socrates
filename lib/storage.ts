// ============================================
// SUPABASE-ONLY SESSION STORAGE
// All data lives in Supabase DB + Storage
// ============================================

import { createClient } from "@/lib/supabase/client";

// ---- Types ----

export interface Probe {
  id: string;
  timestamp: number; // ms since session start
  gapScore: number;
  signals: string[];
  text: string;
  expandedText?: string;
}

export type SessionStatus = "active" | "completed" | "ended_by_tutor";
export type ObserverMode = "off" | "passive" | "active";
export type Frequency = "rare" | "balanced" | "frequent";

export interface Session {
  id: string;
  problem: string;
  startedAt: string; // ISO string
  endedAt?: string;
  durationMs: number;
  status: SessionStatus;
  probes: Probe[];
  hasAudio: boolean;
  audioPath?: string;
  report?: string;
  reportGeneratedAt?: string;
  transcript?: string;
  metadata: {
    observerMode?: ObserverMode;
    frequency?: Frequency;
    eegSummary?: Record<string, number> | null;
  };
}

// ---- Helpers: map DB rows → Session ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbSession(s: any, probes: Probe[] = []): Session {
  return {
    id: s.id,
    problem: s.problem,
    startedAt: s.created_at,
    endedAt: s.ended_at ?? undefined,
    durationMs: s.duration_ms || 0,
    status: s.status || "completed",
    probes,
    hasAudio: !!s.audio_path,
    audioPath: s.audio_path ?? undefined,
    report: s.report ?? undefined,
    reportGeneratedAt: s.report_generated_at ?? undefined,
    transcript: s.transcript ?? undefined,
    metadata: s.metadata || {},
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProbe(p: any): Probe {
  return {
    id: p.id,
    timestamp: p.timestamp_ms,
    gapScore: p.gap_score,
    signals: p.signals || [],
    text: p.text,
    expandedText: p.expanded_text ?? undefined,
  };
}

// ---- Session CRUD ----

export async function createSession(problem: string): Promise<Session> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, problem, status: "active" })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to create session");
  return mapDbSession(data);
}

export async function getSession(id: string): Promise<Session | null> {
  const supabase = createClient();

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!sessionRow) return null;

  const { data: probeRows } = await supabase
    .from("probes")
    .select("*")
    .eq("session_id", id)
    .order("timestamp_ms", { ascending: true });

  return mapDbSession(sessionRow, (probeRows || []).map(mapDbProbe));
}

export async function getSessions(): Promise<Session[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!sessionRows) return [];

  // Batch-load all probes for these sessions
  const sessionIds = sessionRows.map((s: { id: string }) => s.id);
  const { data: allProbes } = await supabase
    .from("probes")
    .select("*")
    .in("session_id", sessionIds)
    .order("timestamp_ms", { ascending: true });

  const probesBySession = new Map<string, Probe[]>();
  for (const p of allProbes || []) {
    const mapped = mapDbProbe(p);
    const existing = probesBySession.get(p.session_id) || [];
    existing.push(mapped);
    probesBySession.set(p.session_id, existing);
  }

  return sessionRows.map((s: { id: string }) => mapDbSession(s, probesBySession.get(s.id) || []));
}

export async function saveSession(session: Session): Promise<void> {
  const supabase = createClient();

  await supabase
    .from("sessions")
    .update({
      problem: session.problem,
      status: session.status,
      duration_ms: session.durationMs,
      ended_at: session.endedAt || null,
      audio_path: session.audioPath || null,
      report: session.report || null,
      report_generated_at: session.reportGeneratedAt || null,
      transcript: session.transcript || null,
      metadata: session.metadata,
    })
    .eq("id", session.id);
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Delete audio from Storage
  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("audio_path")
    .eq("id", id)
    .single();

  if (sessionRow?.audio_path) {
    await supabase.storage.from("session-audio").remove([sessionRow.audio_path]);
  }

  // Delete EEG data from Storage
  const { data: eegRows } = await supabase
    .from("session_eeg_data")
    .select("data_path")
    .eq("session_id", id);

  if (eegRows && eegRows.length > 0) {
    await supabase.storage
      .from("session-eeg")
      .remove(eegRows.map((r: { data_path: string }) => r.data_path));
  }

  // Cascade delete handles probes, eeg rows
  await supabase.from("sessions").delete().eq("id", id);
}

// ---- Probe CRUD ----

export async function addProbe(
  sessionId: string,
  probe: Omit<Probe, "id">
): Promise<Probe> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("probes")
    .insert({
      session_id: sessionId,
      timestamp_ms: probe.timestamp,
      gap_score: probe.gapScore,
      signals: probe.signals,
      text: probe.text,
      expanded_text: probe.expandedText || null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to insert probe");
  return mapDbProbe(data);
}

export async function updateProbeExpanded(probeId: string, expandedText: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("probes")
    .update({ expanded_text: expandedText })
    .eq("id", probeId);
}

// ---- In-memory session helpers (for active recording) ----

export function addProbeToSession(
  session: Session,
  probe: Probe
): Session {
  return {
    ...session,
    probes: [...session.probes, probe],
  };
}

export function endSession(
  session: Session,
  durationMs: number,
  status: SessionStatus = "completed"
): Session {
  return {
    ...session,
    endedAt: new Date().toISOString(),
    durationMs,
    status,
  };
}

// ---- Audio Storage ----

export async function saveSessionAudio(
  sessionId: string,
  audioBlob: Blob
): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const path = `${user.id}/${sessionId}.webm`;

  const { error } = await supabase.storage
    .from("session-audio")
    .upload(path, audioBlob, {
      contentType: "audio/webm",
      upsert: true,
    });

  if (error) throw new Error(error.message);

  // Update session with audio path
  await supabase
    .from("sessions")
    .update({ audio_path: path })
    .eq("id", sessionId);

  return path;
}

export async function getSessionAudio(sessionId: string): Promise<Blob | null> {
  const supabase = createClient();

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("audio_path")
    .eq("id", sessionId)
    .single();

  if (!sessionRow?.audio_path) return null;

  const { data, error } = await supabase.storage
    .from("session-audio")
    .download(sessionRow.audio_path);

  if (error || !data) return null;
  return data;
}

// ---- EEG Storage ----

export async function saveSessionEEG(
  sessionId: string,
  eegData: { channels: Record<string, number[]>; bandPowers: Record<string, number> | null },
  deviceName?: string
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const path = `${user.id}/${sessionId}_eeg.json`;
  const blob = new Blob([JSON.stringify(eegData)], { type: "application/json" });

  await supabase.storage
    .from("session-eeg")
    .upload(path, blob, { contentType: "application/json", upsert: true });

  const sampleCount = Object.values(eegData.channels)[0]?.length || 0;

  await supabase.from("session_eeg_data").insert({
    session_id: sessionId,
    user_id: user.id,
    device_name: deviceName || null,
    data_path: path,
    sample_count: sampleCount,
    avg_band_powers: eegData.bandPowers,
  });

  // Also save summary into session metadata
  if (eegData.bandPowers) {
    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("metadata")
      .eq("id", sessionId)
      .single();

    const existingMeta = sessionRow?.metadata || {};
    await supabase
      .from("sessions")
      .update({ metadata: { ...existingMeta, eegSummary: eegData.bandPowers } })
      .eq("id", sessionId);
  }
}

// ---- Analytics Helpers ----

export function getSessionStats(session: Session) {
  const probeCount = session.probes.length;
  const avgGapScore =
    probeCount > 0
      ? session.probes.reduce((sum, p) => sum + p.gapScore, 0) / probeCount
      : 0;

  const durationMinutes = Math.round(session.durationMs / 60000);
  const probesPerMinute = durationMinutes > 0 ? probeCount / durationMinutes : 0;

  const peakProbe = session.probes.reduce(
    (max, p) => (p.gapScore > max.gapScore ? p : max),
    { gapScore: 0 } as Probe
  );

  return {
    probeCount,
    avgGapScore: Math.round(avgGapScore * 100) / 100,
    durationMinutes,
    probesPerMinute: Math.round(probesPerMinute * 10) / 10,
    peakGapScore: peakProbe.gapScore,
    peakGapTime: peakProbe.timestamp,
  };
}
