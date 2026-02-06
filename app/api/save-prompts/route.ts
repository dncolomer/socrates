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
    const { prompts } = body;

    if (!prompts || typeof prompts !== "object") {
      return NextResponse.json({ error: "Missing prompts object" }, { status: 400 });
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
          prompts,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Save prompts error:", error);
      return NextResponse.json({ error: "Failed to save prompts" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save prompts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
