import { useEffect, useRef, useState } from "react";
import { useInView } from "./useIntersectionObserver";

export function useCountUp(target, duration = 1500) {
  const [count, setCount]       = useState(0);
  const [started, setStarted]   = useState(false);
  const [ref, isVisible]        = useInView();

  useEffect(() => {
    if (!isVisible || started) return;
    setStarted(true);

    const steps    = 60;
    const interval = duration / steps;
    const inc      = target / steps;
    let   current  = 0;

    const timer = setInterval(() => {
      current += inc;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible, started, target, duration]);

  return [count, ref];
}