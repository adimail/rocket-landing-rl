import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  RocketState,
  RocketAction,
  ConnectionStatus,
} from "@/types/simulation";

interface TelemetryHistory {
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
  history: TelemetryHistory;
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
    status: "disconnected",
    latency: 0,
    speed: 1.0,
    tick: 0,
    rockets: [],
    actions: [],
    landingStatus: [],
    rewards: [],
    selectedRocketIndex: 0,
    isAgentEnabled: true,
    history: {},
    activeCharts: ["vy", "vx", "angle", "reward"],

    setConnectionStatus: (status) => set({ status }),
    setLatency: (latency) => set({ latency }),
    setSpeed: (speed) => set({ speed }),

    updateSimulation: (data) =>
      set((state) => {
        const newTick = state.tick + 1;
        const newHistory = { ...state.history };

        if (data.states) {
          data.states.forEach((s, i) => {
            if (!newHistory[i]) {
              newHistory[i] = {
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
            const h = newHistory[i];
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
              Object.keys(h).forEach((k) => h[k as keyof typeof h].shift());
            }
          });
        }

        return {
          tick: newTick,
          rockets: data.states || state.rockets,
          actions: data.actions || state.actions,
          landingStatus: data.landing || state.landingStatus,
          rewards: data.rewards || state.rewards,
          history: newHistory,
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
    resetHistory: () => set({ history: {}, tick: 0 }),
  })),
);
