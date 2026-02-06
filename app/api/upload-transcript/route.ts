import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transcriptId = crypto.randomUUID();
    const filePath = `${user.id}/${transcriptId}.txt`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("user-transcripts")
      .upload(filePath, file);

    if (uploadError) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Create DB record
    const { error: dbError } = await supabase
      .from("user_transcripts")
      .insert({
        id: transcriptId,
        user_id: user.id,
        filename: file.name,
        file_path: filePath,
        status: "pending",
      });

    if (dbError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      transcriptId,
      message: "Upload successful. Processing will begin shortly.",
    });
  } catch (error) {
    console.error("Upload transcript error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
