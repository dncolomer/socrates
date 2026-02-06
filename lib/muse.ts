// ============================================
// MUSE EEG INTEGRATION
// Wrapper using MuseAthenaClient for Web Bluetooth
// ============================================

import {
  MuseAthenaClient,
  type EEGSample,
  type MuseAthenaStatus,
  EEG_CHANNELS,
  isWebBluetoothSupported,
} from "./muse-athena";

export interface EEGReading {
  timestamp: number;     // ms since session start
  electrode: number;     // 0=TP9, 1=AF7, 2=AF8, 3=TP10, 4=FPz, 5=AUX_R, 6=AUX_L
  samples: number[];     // 12 samples per packet at 256Hz
}

export interface BandPowers {
  timestamp: number;
  delta: number;   // 1-4 Hz
  theta: number;   // 4-8 Hz
  alpha: number;   // 7.5-13 Hz
  beta: number;    // 13-30 Hz
  gamma: number;   // 30-44 Hz
}

type BandPowerCallback = (powers: BandPowers) => void;
type StatusCallback = (status: MuseStatus) => void;
export type MuseStatus = "disconnected" | "connecting" | "connected" | "streaming";

export class MuseManager {
  private athenaClient: MuseAthenaClient;
  private eegBuffer: EEGReading[] = [];
  private bandPowerHistory: BandPowers[] = [];
  private _status: MuseStatus = "disconnected";
  private sessionStartTime: number = 0;
  private bandPowerCallbacks: BandPowerCallback[] = [];
  private statusCallbacks: StatusCallback[] = [];
  private fftBuffer: Map<number, number[]> = new Map(); // per-electrode sample buffer
  private computeInterval: NodeJS.Timeout | null = null;
  private unsubEEG: (() => void) | null = null;
  private unsubStatus: (() => void) | null = null;
  deviceName: string | null = null;

  constructor() {
    this.athenaClient = new MuseAthenaClient();
  }

  async connect(): Promise<void> {
    this.setStatus("connecting");
    try {
      // Listen for status changes from the Athena client
      this.unsubStatus = this.athenaClient.onStatusChange((s: MuseAthenaStatus) => {
        // Map Athena status to MuseManager status
        if (s === "disconnected") this.setStatus("disconnected");
        else if (s === "connecting") this.setStatus("connecting");
        else if (s === "connected") this.setStatus("connected");
        else if (s === "streaming") this.setStatus("streaming");
      });

      await this.athenaClient.connect();
      this.deviceName = this.athenaClient.deviceName || "Muse Device";
      this.setStatus("connected");
    } catch (error) {
      this.setStatus("disconnected");
      throw error;
    }
  }

  async startStreaming(sessionStartTime?: number): Promise<void> {
    this.sessionStartTime = sessionStartTime || Date.now();
    this.eegBuffer = [];
    this.bandPowerHistory = [];
    this.fftBuffer.clear();

    // Subscribe to EEG data from the Athena client
    this.unsubEEG = this.athenaClient.onEEG((sample: EEGSample) => {
      // Convert the channel-based sample to per-electrode readings
      for (const [channelName, samples] of Object.entries(sample.channels)) {
        const electrodeIdx = EEG_CHANNELS.indexOf(
          channelName as typeof EEG_CHANNELS[number]
        );
        if (electrodeIdx === -1) continue;

        const eegReading: EEGReading = {
          timestamp: Date.now() - this.sessionStartTime,
          electrode: electrodeIdx,
          samples: [...samples],
        };

        this.eegBuffer.push(eegReading);

        // Accumulate samples per electrode for FFT
        if (!this.fftBuffer.has(electrodeIdx)) {
          this.fftBuffer.set(electrodeIdx, []);
        }
        this.fftBuffer.get(electrodeIdx)!.push(...samples);
      }
    });

    // Start streaming on the Athena client
    await this.athenaClient.startStreaming();

    // Compute band powers every 1 second
    this.computeInterval = setInterval(() => {
      this.computeBandPowers();
    }, 1000);

    this.setStatus("streaming");
  }

  async stopStreaming(): Promise<void> {
    if (this.computeInterval) {
      clearInterval(this.computeInterval);
      this.computeInterval = null;
    }

    if (this.unsubEEG) {
      this.unsubEEG();
      this.unsubEEG = null;
    }

    try {
      await this.athenaClient.stopStreaming();
    } catch {}

    this.setStatus("connected");
  }

  disconnect(): void {
    if (this.computeInterval) {
      clearInterval(this.computeInterval);
      this.computeInterval = null;
    }

    if (this.unsubEEG) {
      this.unsubEEG();
      this.unsubEEG = null;
    }

    if (this.unsubStatus) {
      this.unsubStatus();
      this.unsubStatus = null;
    }

    this.athenaClient.disconnect();
    this.setStatus("disconnected");
  }

  onBandPowers(callback: BandPowerCallback): () => void {
    this.bandPowerCallbacks.push(callback);
    return () => {
      this.bandPowerCallbacks = this.bandPowerCallbacks.filter((cb) => cb !== callback);
    };
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback);
    };
  }

  getStatus(): MuseStatus {
    return this._status;
  }

  getSessionData(): { eeg: EEGReading[]; bands: BandPowers[] } {
    return {
      eeg: this.eegBuffer,
      bands: this.bandPowerHistory,
    };
  }

  getAverageBandPowers(): BandPowers | null {
    if (this.bandPowerHistory.length === 0) return null;

    const avg = { timestamp: 0, delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
    for (const bp of this.bandPowerHistory) {
      avg.delta += bp.delta;
      avg.theta += bp.theta;
      avg.alpha += bp.alpha;
      avg.beta += bp.beta;
      avg.gamma += bp.gamma;
    }
    const n = this.bandPowerHistory.length;
    avg.delta /= n;
    avg.theta /= n;
    avg.alpha /= n;
    avg.beta /= n;
    avg.gamma /= n;
    return avg;
  }

  private setStatus(status: MuseStatus) {
    this._status = status;
    this.statusCallbacks.forEach((cb) => cb(status));
  }

  private computeBandPowers(): void {
    // Average over forehead channels (AF7=1, AF8=2) for focus metric
    const channels = [1, 2]; // AF7, AF8
    const channelPowers: BandPowers[] = [];

    for (const ch of channels) {
      const samples = this.fftBuffer.get(ch);
      if (!samples || samples.length < 256) continue;

      // Take last 256 samples (1 second at 256Hz)
      const window = samples.slice(-256);

      const powers = this.fft256ToBands(window);
      channelPowers.push(powers);
    }

    // Clear old samples, keep last 256
    for (const [ch, samples] of this.fftBuffer.entries()) {
      if (samples.length > 512) {
        this.fftBuffer.set(ch, samples.slice(-256));
      }
    }

    if (channelPowers.length === 0) return;

    // Average across channels
    const avgPowers: BandPowers = {
      timestamp: Date.now() - this.sessionStartTime,
      delta: channelPowers.reduce((s, p) => s + p.delta, 0) / channelPowers.length,
      theta: channelPowers.reduce((s, p) => s + p.theta, 0) / channelPowers.length,
      alpha: channelPowers.reduce((s, p) => s + p.alpha, 0) / channelPowers.length,
      beta: channelPowers.reduce((s, p) => s + p.beta, 0) / channelPowers.length,
      gamma: channelPowers.reduce((s, p) => s + p.gamma, 0) / channelPowers.length,
    };

    // Normalize to relative powers
    const total = avgPowers.delta + avgPowers.theta + avgPowers.alpha + avgPowers.beta + avgPowers.gamma;
    if (total > 0) {
      avgPowers.delta /= total;
      avgPowers.theta /= total;
      avgPowers.alpha /= total;
      avgPowers.beta /= total;
      avgPowers.gamma /= total;
    }

    this.bandPowerHistory.push(avgPowers);
    this.bandPowerCallbacks.forEach((cb) => cb(avgPowers));
  }

  /**
   * Simple DFT-based band power extraction from 256 samples at 256Hz
   */
  private fft256ToBands(samples: number[]): BandPowers {
    const n = samples.length; // 256
    const sampleRate = 256;

    // Apply Hanning window
    const windowed = samples.map((s, i) =>
      s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)))
    );

    // Compute power spectrum via DFT for relevant frequency bins
    // Frequency resolution: sampleRate / n = 1 Hz per bin
    const bandRanges = {
      delta: [1, 4],
      theta: [4, 8],
      alpha: [8, 13],
      beta: [13, 30],
      gamma: [30, 44],
    };

    const powers: Record<string, number> = {};

    for (const [band, [fLow, fHigh]] of Object.entries(bandRanges)) {
      let power = 0;
      const binLow = Math.floor((fLow * n) / sampleRate);
      const binHigh = Math.min(Math.ceil((fHigh * n) / sampleRate), n / 2);

      for (let k = binLow; k <= binHigh; k++) {
        let re = 0;
        let im = 0;
        for (let j = 0; j < n; j++) {
          const angle = (2 * Math.PI * k * j) / n;
          re += windowed[j] * Math.cos(angle);
          im -= windowed[j] * Math.sin(angle);
        }
        power += (re * re + im * im) / (n * n);
      }
      powers[band] = power;
    }

    return {
      timestamp: 0,
      delta: powers.delta || 0,
      theta: powers.theta || 0,
      alpha: powers.alpha || 0,
      beta: powers.beta || 0,
      gamma: powers.gamma || 0,
    };
  }
}

// Singleton
let museManagerInstance: MuseManager | null = null;

export function getMuseManager(): MuseManager {
  if (!museManagerInstance) {
    museManagerInstance = new MuseManager();
  }
  return museManagerInstance;
}

/**
 * Check if Web Bluetooth is supported
 */
export function isMuseSupported(): boolean {
  return isWebBluetoothSupported();
}
