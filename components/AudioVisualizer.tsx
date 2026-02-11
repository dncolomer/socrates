"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  stream?: MediaStream | null;
}

export function AudioVisualizer({ isRecording, stream }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // History buffer for trailing glow
  const historyRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution to match display size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    if (!isRecording || !stream) {
      // Draw idle state
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const y = rect.height / 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.strokeStyle = "rgba(115, 115, 115, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      window.removeEventListener("resize", resize);
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);

    audioCtxRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
    historyRef.current = [];

    const timeDomain = new Float32Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Get waveform data
      analyserRef.current.getFloatTimeDomainData(timeDomain);
      analyserRef.current.getByteFrequencyData(freqData);

      // Compute RMS for glow intensity
      let rms = 0;
      for (let i = 0; i < timeDomain.length; i++) rms += timeDomain[i] * timeDomain[i];
      rms = Math.sqrt(rms / timeDomain.length);
      const intensity = Math.min(1, rms * 8);

      // Push snapshot to history (keep last 4 frames for trailing glow)
      const snapshot = new Float32Array(timeDomain);
      historyRef.current.push(snapshot);
      if (historyRef.current.length > 4) historyRef.current.shift();

      // Draw history trails (fading)
      historyRef.current.forEach((hist, idx) => {
        const alpha = ((idx + 1) / historyRef.current.length) * 0.15;
        drawWaveform(ctx, hist, w, h, `rgba(96, 165, 250, ${alpha})`, 1.5);
      });

      // Draw main waveform with smooth curve
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, `rgba(96, 165, 250, ${0.3 + intensity * 0.7})`);
      gradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.3 + intensity * 0.7})`);
      gradient.addColorStop(1, `rgba(96, 165, 250, ${0.3 + intensity * 0.7})`);

      drawWaveform(ctx, timeDomain, w, h, gradient, 2 + intensity * 1.5);

      // Glow effect
      if (intensity > 0.05) {
        ctx.save();
        ctx.filter = `blur(${4 + intensity * 8}px)`;
        ctx.globalAlpha = intensity * 0.4;
        drawWaveform(ctx, timeDomain, w, h, "rgba(96, 165, 250, 0.6)", 3);
        ctx.restore();
      }

      // Center line (very subtle)
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.strokeStyle = "rgba(115, 115, 115, 0.08)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      audioContext.close();
      analyserRef.current = null;
      audioCtxRef.current = null;
      sourceRef.current = null;
      historyRef.current = [];
      window.removeEventListener("resize", resize);
    };
  }, [isRecording, stream]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-14 sm:h-20 rounded-lg"
      style={{ imageRendering: "auto" }}
    />
  );
}

/**
 * Draw a smooth waveform using cubic Bezier curves.
 * Downsamples the data to ~200 points for performance + smoothness.
 */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  w: number,
  h: number,
  strokeStyle: string | CanvasGradient,
  lineWidth: number
) {
  const points = 200;
  const step = Math.floor(data.length / points);
  const mid = h / 2;
  const amp = h * 0.4; // max amplitude

  ctx.beginPath();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Build point array
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < points; i++) {
    const idx = i * step;
    const val = data[idx] || 0;
    pts.push({
      x: (i / (points - 1)) * w,
      y: mid + val * amp,
    });
  }

  if (pts.length < 2) return;

  ctx.moveTo(pts[0].x, pts[0].y);

  // Draw smooth curve through points using cubic bezier
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    // Catmull-Rom to Bezier conversion
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  ctx.stroke();
}

// Simpler pulsing indicator as fallback
export function RecordingIndicator({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-3 h-3 rounded-full ${
          isRecording ? "bg-red-500 animate-pulse" : "bg-neutral-600"
        }`}
      />
      <span className="text-sm text-neutral-400">
        {isRecording ? "Recording..." : "Not recording"}
      </span>
    </div>
  );
}
