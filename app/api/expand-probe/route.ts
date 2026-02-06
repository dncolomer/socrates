import { NextRequest, NextResponse } from "next/server";
import { expandProbe } from "@/lib/openrouter";
import { getUserPrompts } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { problem, probe } = await request.json();

    if (!problem || !probe) {
      return NextResponse.json({ error: "Missing problem or probe" }, { status: 400 });
    }

    const promptOverrides = await getUserPrompts();

    const result = await expandProbe({
      problem,
      probe,
      promptOverrides,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to expand probe" }, { status: 500 });
    }

    return NextResponse.json({ expanded: result.expanded });
  } catch (error) {
    console.error("Expand probe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
