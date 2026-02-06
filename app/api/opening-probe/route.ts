import { NextRequest, NextResponse } from "next/server";
import { generateOpeningProbe } from "@/lib/openrouter";
import { getUserPrompts } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem } = body;

    if (!problem) {
      return NextResponse.json({ error: "Missing problem" }, { status: 400 });
    }

    const promptOverrides = await getUserPrompts();

    const result = await generateOpeningProbe(problem, promptOverrides);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Opening probe generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ probe: result.probe });
  } catch (error) {
    console.error("Opening probe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
