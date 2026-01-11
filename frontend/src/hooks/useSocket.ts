import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { WS_URL } from "@/lib/constants";
import type { WebSocketMessage, RocketAction } from "@/types/simulation";

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const errorGraceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { setConnectionStatus, updateSimulation, setSpeed, resetHistory } =
    useStore();
  const lastPingRef = useRef<number>(0);

  const connect = useCallback(() => {
    if (
      socketRef.current?.readyState === WebSocket.CONNECTING ||
      socketRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    setConnectionStatus("connecting");

    if (errorGraceTimeoutRef.current)
      clearTimeout(errorGraceTimeoutRef.current);
    errorGraceTimeoutRef.current = setTimeout(() => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        setConnectionStatus("error");
      }
    }, 5000);

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      if (errorGraceTimeoutRef.current)
        clearTimeout(errorGraceTimeoutRef.current);
      setConnectionStatus("connected");
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
    };

    ws.onclose = (event) => {
      if (event.code === 1000) {
        setConnectionStatus("disconnected");
        if (errorGraceTimeoutRef.current)
          clearTimeout(errorGraceTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      // Logic handled by errorGraceTimeout and onclose
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.status === "pong") {
          useStore
            .getState()
            .setLatency(performance.now() - lastPingRef.current);
          return;
        }
        if (data.speed !== undefined) setSpeed(data.speed);
        if (data.restart) resetHistory();

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
  }, [setConnectionStatus, updateSimulation, setSpeed, resetHistory]);

  useEffect(() => {
    connect();
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        lastPingRef.current = performance.now();
      }
    }, 2000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (errorGraceTimeoutRef.current)
        clearTimeout(errorGraceTimeoutRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  const sendCommand = (command: string, payload?: object) => {
    if (command === "restart") resetHistory();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ command, ...payload }));
    }
  };

  const sendAction = (action: RocketAction, index: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, rocket_index: index }));
    }
  };

  return { sendCommand, sendAction, connect };
}
