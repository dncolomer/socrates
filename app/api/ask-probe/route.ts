import { NextRequest, NextResponse } from "next/server";
import { askQuestion } from "@/lib/openrouter";
import { getUserPrompts, getUserAskModel } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { problem, probe, question } = await request.json();

    if (!problem || !probe || !question) {
      return NextResponse.json(
        { error: "Missing problem, probe, or question" },
        { status: 400 }
      );
    }

    const [promptOverrides, userModel] = await Promise.all([
      getUserPrompts(),
      getUserAskModel(),
    ]);

    const result = await askQuestion({
      problem,
      probe,
      question,
      model: userModel,
      promptOverrides,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to answer question" },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer: result.answer });
  } catch (error) {
    console.error("Ask probe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
