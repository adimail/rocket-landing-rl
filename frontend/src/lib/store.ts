import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  RocketState,
  RocketAction,
  ConnectionStatus,
} from "@/types/simulation";

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

    setConnectionStatus: (status) => set({ status }),
    setLatency: (latency) => set({ latency }),
    setSpeed: (speed) => set({ speed }),

    updateSimulation: (data) =>
      set((state) => ({
        tick: state.tick + 1,
        rockets: data.states || state.rockets,
        actions: data.actions || state.actions,
        landingStatus: data.landing || state.landingStatus,
        rewards: data.rewards || state.rewards,
      })),

    setSelectedRocket: (index) => set({ selectedRocketIndex: index }),
    toggleAgent: () =>
      set((state) => ({ isAgentEnabled: !state.isAgentEnabled })),
  })),
);
