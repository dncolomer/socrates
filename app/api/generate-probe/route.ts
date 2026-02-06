import { NextRequest, NextResponse } from "next/server";
import { generateProbe } from "@/lib/openrouter";
import { getUserPrompts } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, gapScore, signals, previousProbes, ragContext, audioBase64, audioFormat } = body;

    if (!problem) {
      return NextResponse.json({ error: "Missing problem" }, { status: 400 });
    }
    if (typeof gapScore !== "number") {
      return NextResponse.json({ error: "Missing gapScore" }, { status: 400 });
    }

    const promptOverrides = await getUserPrompts();

    const result = await generateProbe({
      problem,
      gapScore,
      signals: signals || [],
      previousProbes: previousProbes || [],
      ragContext,
      audioBase64,
      audioFormat,
      promptOverrides,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Probe generation failed" }, { status: 500 });
    }

    return NextResponse.json({ probe: result.probe });
  } catch (error) {
    console.error("Generate probe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
