import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  RocketState,
  RocketAction,
  ConnectionStatus,
} from "@/types/simulation";

export class RingBuffer {
  private buffer: Float64Array;
  private capacity: number;
  private count: number = 0;
  private head: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity);
  }

  push(val: number) {
    this.buffer[this.head] = val;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): Float64Array {
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count);
    }
    const result = new Float64Array(this.capacity);
    const p1 = this.buffer.subarray(this.head, this.capacity);
    const p2 = this.buffer.subarray(0, this.head);
    result.set(p1);
    result.set(p2, p1.length);
    return result;
  }

  clear() {
    this.count = 0;
    this.head = 0;
  }

  get length() {
    return this.count;
  }
}

export interface TelemetryHistory {
  [rocketIndex: number]: {
    ticks: RingBuffer;
    vy: RingBuffer;
    vx: RingBuffer;
    ay: RingBuffer;
    ax: RingBuffer;
    angle: RingBuffer;
    angularVelocity: RingBuffer;
    angularAcceleration: RingBuffer;
    speed: RingBuffer;
    reward: RingBuffer;
  };
}

export const telemetryHistory: TelemetryHistory = {};

const HISTORY_SIZE = 1000;

function initHistory(index: number) {
  if (!telemetryHistory[index]) {
    telemetryHistory[index] = {
      ticks: new RingBuffer(HISTORY_SIZE),
      vy: new RingBuffer(HISTORY_SIZE),
      vx: new RingBuffer(HISTORY_SIZE),
      ay: new RingBuffer(HISTORY_SIZE),
      ax: new RingBuffer(HISTORY_SIZE),
      angle: new RingBuffer(HISTORY_SIZE),
      angularVelocity: new RingBuffer(HISTORY_SIZE),
      angularAcceleration: new RingBuffer(HISTORY_SIZE),
      speed: new RingBuffer(HISTORY_SIZE),
      reward: new RingBuffer(HISTORY_SIZE),
    };
  }
  return telemetryHistory[index];
}

interface SimulationStore {
  status: ConnectionStatus;
  latency: number;
  speed: number;
  tick: number;
  rockets: RocketState[];
  actions: RocketAction[];
  landingStatus: (string | null)[];
  rewards: number[];
  selectedRocketIndex: number;
  isAgentEnabled: boolean;
  activeCharts: string[];

  setConnectionStatus: (status: ConnectionStatus) => void;
  setLatency: (ms: number) => void;
  setSpeed: (speed: number) => void;
  updateSimulation: (data: {
    states?: RocketState[];
    actions?: RocketAction[];
    landing?: (string | null)[];
    rewards?: number[];
  }) => void;
  setSelectedRocket: (index: number) => void;
  toggleAgent: () => void;
  toggleChart: (key: string) => void;
  resetHistory: () => void;
}

export const useStore = create<SimulationStore>()(
  subscribeWithSelector((set) => ({
    status: "connecting",
    latency: 0,
    speed: 1.0,
    tick: 0,
    rockets: [],
    actions: [],
    landingStatus: [],
    rewards: [],
    selectedRocketIndex: 0,
    isAgentEnabled: true,
    activeCharts: ["vy", "vx", "angle", "reward"],

    setConnectionStatus: (status) => set({ status }),
    setLatency: (latency) => set({ latency }),
    setSpeed: (speed) => set({ speed }),

    updateSimulation: (data) =>
      set((state) => {
        const newTick = state.tick + 1;

        if (data.states) {
          data.states.forEach((s, i) => {
            const h = initHistory(i);
            h.ticks.push(newTick);
            h.vy.push(s.vy);
            h.vx.push(s.vx);
            h.ay.push(s.ay);
            h.ax.push(s.ax);
            h.angle.push(s.angle);
            h.angularVelocity.push(s.angularVelocity);
            h.angularAcceleration.push(s.angularAcceleration);
            h.speed.push(s.speed);
            h.reward.push(data.rewards?.[i] || 0);
          });
        }

        return {
          tick: newTick,
          rockets: data.states || state.rockets,
          actions: data.actions || state.actions,
          landingStatus: data.landing || state.landingStatus,
          rewards: data.rewards || state.rewards,
        };
      }),

    setSelectedRocket: (index) => set({ selectedRocketIndex: index }),
    toggleAgent: () =>
      set((state) => ({ isAgentEnabled: !state.isAgentEnabled })),
    toggleChart: (key) =>
      set((state) => ({
        activeCharts: state.activeCharts.includes(key)
          ? state.activeCharts.filter((c) => c !== key)
          : [...state.activeCharts, key],
      })),
    resetHistory: () => {
      Object.values(telemetryHistory).forEach((h) => {
        h.ticks.clear();
        h.vy.clear();
        h.vx.clear();
        h.ay.clear();
        h.ax.clear();
        h.angle.clear();
        h.angularVelocity.clear();
        h.angularAcceleration.clear();
        h.speed.clear();
        h.reward.clear();
      });
      set({ tick: 0 });
    },
  })),
);
