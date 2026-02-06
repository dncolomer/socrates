import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 60;

// Hesitation markers
const HESITATION_MARKERS = ["um", "uh", "hmm", "huh", "er", "ah", "like,", "you know"];
const SELF_CORRECTION_MARKERS = ["actually", "no wait", "let me rethink", "scratch that", "I mean", "correction", "wait no"];
const QUESTION_MARKERS = ["?", "why", "how", "what if", "could it be", "I wonder"];

export async function POST(request: NextRequest) {
  try {
    const { transcriptId } = await request.json();

    if (!transcriptId) {
      return NextResponse.json({ error: "Missing transcriptId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    // Update status to processing
    await supabase
      .from("user_transcripts")
      .update({ status: "processing" })
      .eq("id", transcriptId);

    // Get transcript record
    const { data: transcript, error: fetchError } = await supabase
      .from("user_transcripts")
      .select("*")
      .eq("id", transcriptId)
      .single();

    if (fetchError || !transcript) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("user-transcripts")
      .download(transcript.file_path);

    if (downloadError || !fileData) {
      await supabase.from("user_transcripts").update({ status: "error" }).eq("id", transcriptId);
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

    const text = await fileData.text();

    // Split into 200-400 word chunks, preserving sentence boundaries
    const chunks = splitIntoChunks(text, 200, 400);

    // Tag each chunk with metadata
    const taggedChunks = chunks.map((content, index) => {
      const lower = content.toLowerCase();
      return {
        transcript_id: transcriptId,
        user_id: transcript.user_id,
        chunk_index: index,
        content,
        metadata: {
          has_hesitation: HESITATION_MARKERS.some((m) => lower.includes(m)),
          has_self_correction: SELF_CORRECTION_MARKERS.some((m) => lower.includes(m)),
          has_questions: QUESTION_MARKERS.some((m) => lower.includes(m)),
          word_count: content.split(/\s+/).length,
        },
      };
    });

    // Insert chunks
    if (taggedChunks.length > 0) {
      const { error: insertError } = await supabase
        .from("transcript_chunks")
        .insert(taggedChunks);

      if (insertError) {
        await supabase.from("user_transcripts").update({ status: "error" }).eq("id", transcriptId);
        return NextResponse.json({ error: "Failed to insert chunks" }, { status: 500 });
      }
    }

    // Update transcript status
    await supabase
      .from("user_transcripts")
      .update({ status: "ready", chunk_count: taggedChunks.length })
      .eq("id", transcriptId);

    return NextResponse.json({
      success: true,
      chunkCount: taggedChunks.length,
    });
  } catch (error) {
    console.error("Process transcript error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function splitIntoChunks(text: string, minWords: number, maxWords: number): string[] {
  // Split by sentences
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;

    if (currentWords + sentenceWords > maxWords && currentWords >= minWords) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentWords = sentenceWords;
    } else {
      currentChunk += " " + sentence;
      currentWords += sentenceWords;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
