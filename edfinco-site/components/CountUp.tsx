"use client";

// CSP-safe animated count-up for the stats band. No inline scripts, no dependencies.
// Parses a stat value like "8", "₹0", "100%" into prefix / number / suffix and animates the
// number from 0 to target once the element scrolls into view. Honours prefers-reduced-motion
// (shows the final value immediately) and renders the exact final string if there is no number.
import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: string;
  className?: string;
  durationMs?: number;
}

export default function CountUp({ value, className, durationMs = 1200 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  const prefix = match ? match[1] : "";
  const target = match ? parseInt(match[2], 10) : 0;
  const suffix = match ? match[3] : "";

  // Start at the final value so no-JS / SSR output is already correct (no layout shift, a11y-safe).
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!match) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion or nothing to count: keep the final value already rendered (initial state).
    if (prefersReduced || target === 0) return;

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let started = false;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(`${prefix}${Math.round(eased * target)}${suffix}`);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      setDisplay(`${prefix}0${suffix}`);
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
