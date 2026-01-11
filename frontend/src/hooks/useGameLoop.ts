import { useEffect, useRef } from "react";

export function useGameLoop(callback: (time: number) => void) {
  const requestRef = useRef<number>(undefined);
  const previousTimeRef = useRef<number>(undefined);

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      callback(time);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);
}
