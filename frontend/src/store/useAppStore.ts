import { create } from "zustand";

interface AppState {
  isConnected: boolean;
  isAgentEnabled: boolean;
  activeRocketIndex: number;
  error: string | null;
  setConnected: (status: boolean) => void;
  toggleAgent: () => void;
  setActiveRocket: (index: number) => void;
  setError: (message: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isConnected: false,
  isAgentEnabled: false,
  activeRocketIndex: 0,
  error: null,
  setConnected: (status) =>
    set({
      isConnected: status,
      error: status ? null : "Disconnected from server",
    }),
  toggleAgent: () =>
    set((state) => ({ isAgentEnabled: !state.isAgentEnabled })),
  setActiveRocket: (index) => set({ activeRocketIndex: index }),
  setError: (message) => set({ error: message }),
}));
