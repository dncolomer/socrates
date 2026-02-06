"use client";

import { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  stream?: MediaStream | null;
}

export function AudioVisualizer({ isRecording, stream }: AudioVisualizerProps) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const [levels, setLevels] = useState<number[]>(new Array(32).fill(0));

  useEffect(() => {
    if (!isRecording || !stream) {
      setLevels(new Array(32).fill(0));
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const animate = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const newLevels = Array.from(dataArray).map((v) => v / 255);
      setLevels(newLevels);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      audioContext.close();
      analyserRef.current = null;
    };
  }, [isRecording, stream]);

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {levels.map((level, i) => (
        <div
          key={i}
          className="w-1.5 bg-blue-500 rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(4, level * 60)}px`,
            opacity: isRecording ? 0.5 + level * 0.5 : 0.2,
          }}
        />
      ))}
    </div>
  );
}

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
