// ============================================
// AUDIO RECORDING UTILITIES
// Chunked recording with sliding window buffer
// ============================================

export interface AudioChunk {
  blob: Blob;
  timestamp: number;
  duration: number;
}

export interface AudioRecorderConfig {
  chunkDurationMs: number;
  maxBufferDurationMs: number;
  onChunk?: (chunk: AudioChunk) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG: AudioRecorderConfig = {
  chunkDurationMs: 5000,
  maxBufferDurationMs: 30000,
};

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: AudioChunk[] = [];
  private allChunks: Blob[] = [];
  private config: AudioRecorderConfig;
  private startTime: number = 0;
  private isRecording: boolean = false;

  constructor(config: Partial<AudioRecorderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.isRecording) {
      throw new Error("Already recording");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      this.startTime = Date.now();
      this.chunks = [];
      this.allChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const chunk: AudioChunk = {
            blob: event.data,
            timestamp: Date.now() - this.startTime,
            duration: this.config.chunkDurationMs,
          };

          this.chunks.push(chunk);
          this.allChunks.push(event.data);
          this.trimBuffer();
          this.config.onChunk?.(chunk);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event}`);
        this.config.onError?.(error);
      };

      this.mediaRecorder.start(this.config.chunkDurationMs);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  stop(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }

  private trimBuffer(): void {
    const maxChunks = Math.ceil(
      this.config.maxBufferDurationMs / this.config.chunkDurationMs
    );

    while (this.chunks.length > maxChunks) {
      this.chunks.shift();
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "audio/webm";
  }

  getRecentAudio(durationMs?: number): Blob | null {
    if (this.chunks.length === 0) return null;

    let chunksToUse = this.chunks;

    if (durationMs) {
      const chunksNeeded = Math.ceil(durationMs / this.config.chunkDurationMs);
      chunksToUse = this.chunks.slice(-chunksNeeded);
    }

    const blobs = chunksToUse.map((c) => c.blob);
    return new Blob(blobs, { type: this.getMimeType() });
  }

  getFullAudio(): Blob | null {
    if (this.allChunks.length === 0) return null;
    return new Blob(this.allChunks, { type: this.getMimeType() });
  }

  getAudioFormat(): string {
    const mimeType = this.getMimeType();
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("mp4")) return "mp4";
    return "webm";
  }

  private getMimeType(): string {
    return this.mediaRecorder?.mimeType || "audio/webm";
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getElapsedTime(): number {
    if (!this.isRecording) return 0;
    return Date.now() - this.startTime;
  }

  getBufferDuration(): number {
    return this.chunks.length * this.config.chunkDurationMs;
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadAudio(blob: Blob, filename: string = "recording.webm"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
