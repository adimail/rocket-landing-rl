import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { RocketState, RocketAction, WebSocketMessage } from "@/types";
import { WS_URL } from "@/lib/constants";

export function useSimulationSocket(
  statesRef: React.MutableRefObject<RocketState[]>,
  actionsRef: React.MutableRefObject<RocketAction[]>,
  metaRef: React.MutableRefObject<{
    rewards: number[];
    dones: boolean[];
    landing: (string | null)[];
    crashed: boolean[];
    explosionStart: number[];
  }>,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const setConnected = useAppStore((s) => s.setConnected);
  const setError = useAppStore((s) => s.setError);

  const sendCommand = (command: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ command }));
    }
  };

  const sendAction = (action: RocketAction, index: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action,
          rocket_index: index,
        }),
      );
    }
  };

  const sendSpeed = (speed: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ speed }));
    }
  };

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onclose = (event) => {
        setConnected(false);
        if (!event.wasClean) {
          setError(
            "Connection lost. Ensure the simulation backend is running at " +
              WS_URL,
          );
        }
      };

      ws.onerror = () => {
        setError(
          "WebSocket connection failed. Check if the server is active on port 9000.",
        );
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);

          if (data.status) return;

          let newStates = data.state;
          let newActions = data.action;
          let newLanding = data.landing;
          let newRewards = data.reward;
          let newDones = data.done;

          if (data.step) {
            newStates = data.step.state;
            newRewards = data.step.reward;
            newDones = data.step.done;
            newActions = data.step.prev_action_taken;
            newLanding = data.landing;
          }

          if (newStates) {
            statesRef.current = newStates;

            if (newStates.length !== metaRef.current.crashed.length) {
              metaRef.current.crashed = new Array(newStates.length).fill(false);
              metaRef.current.explosionStart = new Array(newStates.length).fill(
                0,
              );
              metaRef.current.rewards = new Array(newStates.length).fill(0);
              metaRef.current.dones = new Array(newStates.length).fill(false);
              metaRef.current.landing = new Array(newStates.length).fill(null);
            }
          }

          if (newActions) actionsRef.current = newActions;
          if (newRewards) metaRef.current.rewards = newRewards;
          if (newDones) metaRef.current.dones = newDones;
          if (newLanding) metaRef.current.landing = newLanding;

          if (newDones && newStates) {
            newDones.forEach((isDone: boolean, idx: number) => {
              if (isDone) {
                const status = newLanding?.[idx];
                const isUnsafe = status === "unsafe";
                const y = newStates![idx].y;

                if (isUnsafe || (y <= 0.1 && !status)) {
                  if (!metaRef.current.crashed[idx]) {
                    metaRef.current.crashed[idx] = true;
                    metaRef.current.explosionStart[idx] = performance.now();
                  }
                } else if (status && status !== "unsafe") {
                  metaRef.current.crashed[idx] = false;
                }
              } else if (newStates![idx].y > 10) {
                metaRef.current.crashed[idx] = false;
              }
            });
          }

          if (data.restart || data.initial) {
            metaRef.current.crashed.fill(false);
          }
        } catch (e) {
          console.error(e);
        }
      };
    };

    connect();

    return () => {
      socketRef.current?.close();
    };
  }, [setConnected, setError, statesRef, actionsRef, metaRef]);

  return { sendCommand, sendAction, sendSpeed };
}
