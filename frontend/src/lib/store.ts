import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  RocketState,
  RocketAction,
  ConnectionStatus,
} from "@/types/simulation";

export interface TelemetryHistory {
  [rocketIndex: number]: {
    ticks: number[];
    vy: number[];
    vx: number[];
    ay: number[];
    ax: number[];
    angle: number[];
    angularVelocity: number[];
    angularAcceleration: number[];
    speed: number[];
    reward: number[];
  };
}

export const telemetryHistory: TelemetryHistory = {};

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
            if (!telemetryHistory[i]) {
              telemetryHistory[i] = {
                ticks: [],
                vy: [],
                vx: [],
                ay: [],
                ax: [],
                angle: [],
                angularVelocity: [],
                angularAcceleration: [],
                speed: [],
                reward: [],
              };
            }
            const h = telemetryHistory[i];
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

            if (h.ticks.length > 1000) {
              h.ticks.shift();
              h.vy.shift();
              h.vx.shift();
              h.ay.shift();
              h.ax.shift();
              h.angle.shift();
              h.angularVelocity.shift();
              h.angularAcceleration.shift();
              h.speed.shift();
              h.reward.shift();
            }
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
      Object.keys(telemetryHistory).forEach((key) => {
        delete telemetryHistory[Number(key)];
      });
      set({ tick: 0 });
    },
  })),
);
