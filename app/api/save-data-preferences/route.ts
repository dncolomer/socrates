import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    const { data_sharing } = body;

    if (!data_sharing || typeof data_sharing !== "object") {
      return NextResponse.json({ error: "Missing data_sharing object" }, { status: 400 });
    }

    // Validate shape
    if (
      typeof data_sharing.share_transcripts !== "boolean" ||
      typeof data_sharing.share_audio !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid data_sharing values" }, { status: 400 });
    }

    // Load existing metadata to merge (don't overwrite other metadata fields)
    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    const existingMetadata = profile?.metadata || {};

    const { error } = await supabase
      .from("profiles")
      .update({
        metadata: {
          ...existingMetadata,
          data_sharing,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Save data preferences error:", error);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save data preferences error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
