"use client";

import { useEffect, useRef, useCallback } from "react";

interface EEGWaveViewProps {
  /** Map of channel name -> rolling sample buffer (microvolts) */
  channelData: Map<string, number[]>;
  /** How many samples to show on screen (default 512 = ~2s at 256Hz) */
  visibleSamples?: number;
  /** Height per channel trace in px */
  traceHeight?: number;
  /** Which channels to render (default: AF7, AF8, TP9, TP10) */
  channels?: string[];
}

const DEFAULT_CHANNELS = ["TP9", "AF7", "AF8", "TP10"];

const CHANNEL_COLORS: Record<string, string> = {
  TP9: "#a78bfa",   // purple
  AF7: "#60a5fa",   // blue
  AF8: "#34d399",   // green
  TP10: "#fbbf24",  // amber
  FPz: "#f472b6",   // pink
  AUX_R: "#94a3b8", // slate
  AUX_L: "#94a3b8", // slate
};

export function EEGWaveView({
  channelData,
  visibleSamples = 512,
  traceHeight = 40,
  channels = DEFAULT_CHANNELS,
}: EEGWaveViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const totalHeight = channels.length * traceHeight;

    // Resize canvas if needed
    if (canvas.width !== width * dpr || canvas.height !== totalHeight * dpr) {
      canvas.width = width * dpr;
      canvas.height = totalHeight * dpr;
      canvas.style.height = `${totalHeight}px`;
      ctx.scale(dpr, dpr);
    }

    // Clear
    ctx.clearRect(0, 0, width, totalHeight);

    // Draw each channel
    channels.forEach((channelName, chIdx) => {
      const samples = channelData.get(channelName);
      const yCenter = chIdx * traceHeight + traceHeight / 2;
      const color = CHANNEL_COLORS[channelName] || "#94a3b8";

      // Channel label
      ctx.font = "9px monospace";
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fillText(channelName, 4, yCenter - traceHeight / 2 + 10);
      ctx.globalAlpha = 1;

      // Separator line
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, chIdx * traceHeight);
      ctx.lineTo(width, chIdx * traceHeight);
      ctx.stroke();

      if (!samples || samples.length < 2) {
        // Draw flat line
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(0, yCenter);
        ctx.lineTo(width, yCenter);
        ctx.stroke();
        return;
      }

      // Take the last `visibleSamples` samples
      const visible = samples.slice(-visibleSamples);
      const step = width / visibleSamples;

      // Amplitude scaling: map ~±200µV to half-trace height
      const ampScale = traceHeight / 2 / 200;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();

      for (let i = 0; i < visible.length; i++) {
        const x = i * step;
        const y = yCenter - visible[i] * ampScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    animFrameRef.current = requestAnimationFrame(draw);
  }, [channelData, channels, traceHeight, visibleSamples]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  const totalHeight = channels.length * traceHeight;

  return (
    <div className="rounded-lg overflow-hidden bg-neutral-950/50 border border-neutral-800/50">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${totalHeight}px` }}
      />
    </div>
  );
}
