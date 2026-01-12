import { create } from "zustand";
import { subscribeWithSelector, persist } from "zustand/middleware";
import type {
  RocketState,
  RocketAction,
  ConnectionStatus,
} from "@/types/simulation";
import { RingBuffer } from "@/lib/structures/RingBuffer";

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
  isSimPlaying: boolean;

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
  setSimStatus: (status: string) => void;
}

export const useStore = create<SimulationStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
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
        isSimPlaying: false,

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
          set((state) => {
            const isAlreadyActive = state.activeCharts.includes(key);
            return {
              activeCharts: isAlreadyActive
                ? state.activeCharts.filter((c) => c !== key)
                : [key, ...state.activeCharts],
            };
          }),
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
          set({
            tick: 0,
            rockets: [],
            actions: [],
            landingStatus: [],
            rewards: [],
          });
        },
        setSimStatus: (status) => set({ isSimPlaying: status === "playing" }),
      }),
      {
        name: "rocket-sim-storage",
        partialize: (state) => ({
          activeCharts: state.activeCharts,
          isAgentEnabled: state.isAgentEnabled,
        }),
      },
    ),
  ),
);
