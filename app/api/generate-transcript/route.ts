import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 120; // Transcription of long audio can take time

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, problem } = body;

    if (!sessionId || !problem) {
      return NextResponse.json(
        { error: "Missing sessionId or problem" },
        { status: 400 }
      );
    }

    // Verify session belongs to user and has audio
    const { data: session } = await supabase
      .from("sessions")
      .select("id, audio_path, user_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.audio_path) {
      return NextResponse.json(
        { error: "No audio recording for this session" },
        { status: 400 }
      );
    }

    // Download audio from Supabase Storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("session-audio")
      .download(session.audio_path);

    if (downloadError || !audioData) {
      console.error("Audio download error:", downloadError);
      return NextResponse.json(
        { error: "Failed to download audio" },
        { status: 500 }
      );
    }

    // Convert to base64
    const arrayBuffer = await audioData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine format from file extension
    const ext = session.audio_path.split(".").pop() || "webm";

    // Transcribe
    const result = await transcribeAudio({
      audioBase64: base64,
      audioFormat: ext,
      problem,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Transcription failed" },
        { status: 500 }
      );
    }

    // Save transcript to session
    await supabase
      .from("sessions")
      .update({ transcript: result.transcript })
      .eq("id", sessionId);

    return NextResponse.json({ transcript: result.transcript });
  } catch (error) {
    console.error("Generate transcript error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
