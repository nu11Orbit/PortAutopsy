import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Only runs when `active` flips true (so animation plays when Fix column appears).
 */
export function useCountUp(target, duration = 600, active = true) {
  const [display, setDisplay] = useState(active ? target : 0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setDisplay(target);
      return;
    }
    if (typeof target !== 'number') {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target * 10) / 10);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, active, duration]);

  return display;
}
