// ============================================
// MUSE ATHENA / MUSE S - Web Bluetooth Client
// Ported from amused-py (MIT license)
// https://github.com/Amused-EEG/amused-py
// ============================================

// BLE GATT UUIDs
const MUSE_SERVICE = 0xfe8d;
const CONTROL_CHAR = "273e0001-4c4d-454d-96be-f03bac821358";
const SENSOR_CHAR = "273e0013-4c4d-454d-96be-f03bac821358";
const EEG_TP9_CHAR = "273e0003-4c4d-454d-96be-f03bac821358"; // fallback

// Binary commands (hex-encoded, matching amused-py)
const COMMANDS = {
  halt: new Uint8Array([0x02, 0x68, 0x0a]),
  version: new Uint8Array([0x03, 0x76, 0x36, 0x0a]),
  status: new Uint8Array([0x02, 0x73, 0x0a]),
  p21: new Uint8Array([0x04, 0x70, 0x32, 0x31, 0x0a]),
  p1035: new Uint8Array([0x06, 0x70, 0x31, 0x30, 0x33, 0x35, 0x0a]),
  dc001: new Uint8Array([0x06, 0x64, 0x63, 0x30, 0x30, 0x31, 0x0a]),
  L1: new Uint8Array([0x03, 0x4c, 0x31, 0x0a]),
};

// EEG channel names (Muse S/Athena has 7 channels)
export const EEG_CHANNELS = [
  "TP9",
  "AF7",
  "AF8",
  "TP10",
  "FPz",
  "AUX_R",
  "AUX_L",
] as const;

// EEG scaling: convert 12-bit ADC to microvolts
const EEG_SCALE = 1000.0 / 2048.0;
// IMU scaling
const IMU_SCALE = 1.0 / 100.0;

// ============================================
// Types
// ============================================

export interface EEGSample {
  timestamp: number;
  channels: Record<string, number[]>; // channel name -> 12 samples in microvolts
}

export interface PPGSample {
  timestamp: number;
  samples: number[];
}

export interface IMUSample {
  timestamp: number;
  accel: [number, number, number];
  gyro: [number, number, number];
}

export interface DeviceInfo {
  firmware?: string;
  battery?: number;
  name?: string;
}

export type MuseAthenaStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "streaming";

// ============================================
// Packet Decoder
// ============================================

function decodeEEGSegment(data: DataView, offset: number): number[] {
  const samples: number[] = [];

  // 18 bytes = 12 samples (3 bytes -> 2 x 12-bit samples)
  for (let i = 0; i < 6; i++) {
    const byteOffset = offset + i * 3;
    if (byteOffset + 2 >= data.byteLength) break;

    const b0 = data.getUint8(byteOffset);
    const b1 = data.getUint8(byteOffset + 1);
    const b2 = data.getUint8(byteOffset + 2);

    const sample1 = (b0 << 4) | (b1 >> 4);
    const sample2 = ((b1 & 0x0f) << 8) | b2;

    samples.push((sample1 - 2048) * EEG_SCALE);
    samples.push((sample2 - 2048) * EEG_SCALE);
  }

  return samples;
}

function looksLikeEEG(data: DataView, offset: number): boolean {
  if (offset + 18 > data.byteLength) return false;
  const b0 = data.getUint8(offset);
  const b1 = data.getUint8(offset + 1);
  const sample = (b0 << 4) | (b1 >> 4);
  return sample > 1000 && sample < 3000;
}

function decodePacketDF(
  data: DataView
): { eeg: Record<string, number[]>; ppg: number[] } {
  const eeg: Record<string, number[]> = {};
  const ppg: number[] = [];
  let offset = 4; // skip 4-byte header
  let channelIdx = 0;

  // Extract up to 7 EEG segments (18 bytes each)
  while (offset + 18 <= data.byteLength && channelIdx < 7) {
    if (looksLikeEEG(data, offset)) {
      const channelName = EEG_CHANNELS[channelIdx] ?? `ch${channelIdx}`;
      eeg[channelName] = decodeEEGSegment(data, offset);
      channelIdx++;
      offset += 18;
    } else if (offset + 20 <= data.byteLength) {
      // Try PPG (20 bytes)
      for (let i = 0; i < 18; i += 3) {
        if (offset + i + 1 < data.byteLength) {
          const val = (data.getUint8(offset + i) << 8) | data.getUint8(offset + i + 1);
          if (val > 10000) ppg.push(val);
        }
      }
      offset += 20;
    } else {
      break;
    }
  }

  return { eeg, ppg };
}

function decodePacketF4(
  data: DataView
): { accel: [number, number, number]; gyro: [number, number, number] } | null {
  if (data.byteLength < 16) return null;
  const offset = 4;

  const ax = data.getInt16(offset, false) * IMU_SCALE;
  const ay = data.getInt16(offset + 2, false) * IMU_SCALE;
  const az = data.getInt16(offset + 4, false) * IMU_SCALE;
  const gx = data.getInt16(offset + 6, false) * IMU_SCALE;
  const gy = data.getInt16(offset + 8, false) * IMU_SCALE;
  const gz = data.getInt16(offset + 10, false) * IMU_SCALE;

  return {
    accel: [ax, ay, az],
    gyro: [gx, gy, gz],
  };
}

// ============================================
// MuseAthenaClient
// ============================================

export class MuseAthenaClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private controlChar: BluetoothRemoteGATTCharacteristic | null = null;
  private sensorChar: BluetoothRemoteGATTCharacteristic | null = null;

  private _status: MuseAthenaStatus = "disconnected";
  private _deviceName: string | null = null;
  private _deviceInfo: DeviceInfo = {};

  // Callbacks
  private onEEGCallbacks: ((sample: EEGSample) => void)[] = [];
  private onPPGCallbacks: ((sample: PPGSample) => void)[] = [];
  private onIMUCallbacks: ((sample: IMUSample) => void)[] = [];
  private onStatusCallbacks: ((status: MuseAthenaStatus) => void)[] = [];

  get status(): MuseAthenaStatus {
    return this._status;
  }

  get deviceName(): string | null {
    return this._deviceName;
  }

  get deviceInfo(): DeviceInfo {
    return this._deviceInfo;
  }

  // ---- Event registration ----

  onEEG(cb: (sample: EEGSample) => void): () => void {
    this.onEEGCallbacks.push(cb);
    return () => {
      this.onEEGCallbacks = this.onEEGCallbacks.filter((c) => c !== cb);
    };
  }

  onPPG(cb: (sample: PPGSample) => void): () => void {
    this.onPPGCallbacks.push(cb);
    return () => {
      this.onPPGCallbacks = this.onPPGCallbacks.filter((c) => c !== cb);
    };
  }

  onIMU(cb: (sample: IMUSample) => void): () => void {
    this.onIMUCallbacks.push(cb);
    return () => {
      this.onIMUCallbacks = this.onIMUCallbacks.filter((c) => c !== cb);
    };
  }

  onStatusChange(cb: (status: MuseAthenaStatus) => void): () => void {
    this.onStatusCallbacks.push(cb);
    return () => {
      this.onStatusCallbacks = this.onStatusCallbacks.filter((c) => c !== cb);
    };
  }

  // ---- Connection ----

  async connect(): Promise<void> {
    this.setStatus("connecting");

    try {
      // Step 1: Request device via Web Bluetooth
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MUSE_SERVICE] }],
      });

      this._deviceName = this.device.name || "Muse Device";

      // Step 2: Connect GATT
      this.server = await this.device.gatt!.connect();

      // Step 3: Get service
      const service = await this.server.getPrimaryService(MUSE_SERVICE);

      // Step 4: Get control characteristic
      this.controlChar = await service.getCharacteristic(CONTROL_CHAR);

      // Step 5: Get sensor characteristic (try combined first, fallback to TP9)
      try {
        this.sensorChar = await service.getCharacteristic(SENSOR_CHAR);
      } catch {
        console.warn(
          "[MuseAthena] Combined sensor char not found, trying TP9 fallback"
        );
        this.sensorChar = await service.getCharacteristic(EEG_TP9_CHAR);
      }

      // Step 6: Subscribe to control notifications
      await this.controlChar.startNotifications();
      this.controlChar.addEventListener(
        "characteristicvaluechanged",
        this.handleControlNotification.bind(this)
      );

      // Step 7: Send initialization commands
      await this.writeCommand(COMMANDS.version);
      await this.sleep(100);
      await this.writeCommand(COMMANDS.status);
      await this.sleep(100);
      await this.writeCommand(COMMANDS.halt);
      await this.sleep(100);

      this.setStatus("connected");
    } catch (err) {
      this.setStatus("disconnected");
      throw err;
    }
  }

  async startStreaming(preset: "p1035" | "p21" = "p1035"): Promise<void> {
    if (!this.controlChar || !this.sensorChar) {
      throw new Error("Not connected");
    }

    // Set preset
    await this.writeCommand(COMMANDS[preset]);
    await this.sleep(100);

    // Subscribe to sensor notifications
    await this.sensorChar.startNotifications();
    this.sensorChar.addEventListener(
      "characteristicvaluechanged",
      this.handleSensorNotification.bind(this)
    );

    // Start streaming -- send dc001 TWICE (critical!)
    await this.writeCommand(COMMANDS.dc001);
    await this.sleep(50);
    await this.writeCommand(COMMANDS.dc001);
    await this.sleep(100);

    // Send L1
    await this.writeCommand(COMMANDS.L1);

    this.setStatus("streaming");
  }

  async stopStreaming(): Promise<void> {
    if (this.controlChar) {
      try {
        await this.writeCommand(COMMANDS.halt);
      } catch {}
    }

    if (this.sensorChar) {
      try {
        await this.sensorChar.stopNotifications();
      } catch {}
    }

    this.setStatus("connected");
  }

  disconnect(): void {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.controlChar = null;
    this.sensorChar = null;
    this.setStatus("disconnected");
  }

  // ---- Internal handlers ----

  private handleControlNotification(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const data = target.value;
    if (!data) return;

    try {
      // Try to decode as UTF-8 JSON (device info responses)
      const bytes = new Uint8Array(data.buffer);
      const text = new TextDecoder("utf-8").decode(bytes);
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        if (json.fw) this._deviceInfo.firmware = json.fw;
        if (json.bp) this._deviceInfo.battery = json.bp;
      }
    } catch {
      // Not JSON, ignore
    }
  }

  private handleSensorNotification(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value || value.byteLength === 0) return;

    const data = new DataView(value.buffer, value.byteOffset, value.byteLength);
    const packetType = data.getUint8(0);
    const now = Date.now();

    switch (packetType) {
      case 0xdf: {
        const { eeg, ppg } = decodePacketDF(data);

        if (Object.keys(eeg).length > 0) {
          const sample: EEGSample = { timestamp: now, channels: eeg };
          this.onEEGCallbacks.forEach((cb) => cb(sample));
        }

        if (ppg.length > 0) {
          const ppgSample: PPGSample = { timestamp: now, samples: ppg };
          this.onPPGCallbacks.forEach((cb) => cb(ppgSample));
        }
        break;
      }

      case 0xf4: {
        const imu = decodePacketF4(data);
        if (imu) {
          const sample: IMUSample = { timestamp: now, ...imu };
          this.onIMUCallbacks.forEach((cb) => cb(sample));
        }
        break;
      }

      // 0xDB, 0xD9 -- mixed packets, try generic EEG extraction
      case 0xdb:
      case 0xd9: {
        // Attempt EEG extraction from mixed packets
        const { eeg } = decodePacketDF(data);
        if (Object.keys(eeg).length > 0) {
          const sample: EEGSample = { timestamp: now, channels: eeg };
          this.onEEGCallbacks.forEach((cb) => cb(sample));
        }
        break;
      }
    }
  }

  private async writeCommand(cmd: Uint8Array): Promise<void> {
    if (!this.controlChar) throw new Error("Not connected");
    // Create a fresh ArrayBuffer to satisfy the BufferSource type constraint
    const buf = new ArrayBuffer(cmd.length);
    new Uint8Array(buf).set(cmd);
    await this.controlChar.writeValueWithoutResponse(new DataView(buf));
  }

  private setStatus(status: MuseAthenaStatus): void {
    this._status = status;
    this.onStatusCallbacks.forEach((cb) => cb(status));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Helpers
// ============================================

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}
