import { NextRequest, NextResponse } from "next/server";
import { analyzeGap } from "@/lib/openrouter";
import { getUserPrompts } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioBase64, audioFormat, problem } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: "Missing audioBase64" }, { status: 400 });
    }
    if (!problem) {
      return NextResponse.json({ error: "Missing problem" }, { status: 400 });
    }

    const promptOverrides = await getUserPrompts();

    const result = await analyzeGap({
      audioBase64,
      audioFormat: audioFormat || "webm",
      problem,
      promptOverrides,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Analysis failed" }, { status: 500 });
    }

    return NextResponse.json({
      gap_score: result.result!.gap_score,
      signals: result.result!.signals,
    });
  } catch (error) {
    console.error("Analyze gap error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
