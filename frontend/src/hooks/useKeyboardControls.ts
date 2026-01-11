import { useEffect, useRef } from "react";
import type { RocketAction } from "@/types";

export function useKeyboardControls(onAction: (action: RocketAction) => void) {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "d"].includes(key)) {
        if (isDown) keys.current.add(key);
        else keys.current.delete(key);

        const hasLeft = keys.current.has("a");
        const hasRight = keys.current.has("d");
        const hasUp = keys.current.has("w");

        let coldGas = 0;
        if (hasLeft && !hasRight) coldGas = -1.0;
        if (!hasLeft && hasRight) coldGas = 1.0;

        onAction({
          throttle: hasUp ? 1.0 : 0.0,
          coldGas,
        });
      }
    };

    const down = (e: KeyboardEvent) => handleKey(e, true);
    const up = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onAction]);
}
