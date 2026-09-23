import { useState, useEffect, useRef } from 'react';

export function useFpsTracker() {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const loop = (now: number) => {
      frameCount.current++;
      const delta = now - lastTime.current;
      if (delta >= 500) { // update every 500ms
        const currentFps = Math.round((frameCount.current * 1000) / delta);
        setFps(Math.min(currentFps, 60));
        frameCount.current = 0;
        lastTime.current = now;
      }
      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return fps;
}

export function countDomNodes(): number {
  return document.querySelectorAll('*').length;
}
