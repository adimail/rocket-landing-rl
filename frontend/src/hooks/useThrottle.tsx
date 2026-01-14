import { useState, useEffect, useRef } from "react";

export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());
  const nextValue = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    nextValue.current = value;

    const loop = () => {
      const now = Date.now();
      const timeSinceLast = now - lastRan.current;

      if (timeSinceLast >= limit) {
        if (nextValue.current !== throttledValue) {
          setThrottledValue(nextValue.current);
          lastRan.current = now;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, limit, throttledValue]);

  return throttledValue;
}
