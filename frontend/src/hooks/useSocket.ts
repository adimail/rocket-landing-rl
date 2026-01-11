import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { WS_URL } from "@/lib/constants";
import type { WebSocketMessage, RocketAction } from "@/types/simulation";

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const { setConnectionStatus, updateSimulation, setSpeed } = useStore();
  const lastPingRef = useRef<number>(0);

  const sendCommand = (command: string, payload?: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ command, ...payload }));
    }
  };

  const sendAction = (action: RocketAction, index: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, rocket_index: index }));
    }
  };

  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval>;

    const connect = () => {
      setConnectionStatus("connecting");
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = performance.now();
          }
        }, 2000);
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        clearInterval(pingInterval);
        setTimeout(connect, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);

          if (data.status === "pong") {
            const latency = performance.now() - lastPingRef.current;
            useStore.getState().setLatency(latency);
            return;
          }

          if (data.speed !== undefined) {
            setSpeed(data.speed);
          }

          let states = data.state;
          let actions = data.action;
          let landing = data.landing;
          let rewards = data.reward;

          if (data.step) {
            states = data.step.state;
            actions = data.step.prev_action_taken;
            rewards = data.step.reward;
            landing = data.landing;
          }

          updateSimulation({ states, actions, landing, rewards });
        } catch (e) {
          console.error("Parse error", e);
        }
      };
    };

    connect();

    return () => {
      clearInterval(pingInterval);
      socketRef.current?.close();
    };
  }, [setConnectionStatus, updateSimulation, setSpeed]);

  return { sendCommand, sendAction };
}
