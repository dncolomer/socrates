import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

// ElevenLabs "Adam" voice -- calm, professorial male
const VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 501 }
    );
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const response = await fetch(ELEVENLABS_API_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return NextResponse.json(
        { error: `TTS API error: ${response.status}` },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
