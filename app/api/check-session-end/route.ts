import { NextRequest, NextResponse } from "next/server";
import { checkSessionEnd } from "@/lib/openrouter";
import { getUserPrompts } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { elapsed, probeCount, recentScores, problem } = body;

    if (!problem) {
      return NextResponse.json({ error: "Missing problem" }, { status: 400 });
    }

    const promptOverrides = await getUserPrompts();

    const result = await checkSessionEnd({
      elapsed: elapsed || "0:00",
      probeCount: probeCount || 0,
      recentScores: recentScores || [],
      problem,
      promptOverrides,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Check failed" }, { status: 500 });
    }

    return NextResponse.json(result.result);
  } catch (error) {
    console.error("Check session end error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
