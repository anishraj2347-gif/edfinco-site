"use client";

// Progressive-enhancement scroll reveal. Content is visible by default (CSS .reveal),
// and only hidden/animated when JS + IntersectionObserver are available AND the user has not
// requested reduced motion. No layout shift, no dependency.
import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  as?: "div" | "section" | "li" | "article";
  className?: string;
  id?: string;
  delay?: number;
}

export default function Reveal({ children, as = "div", className, id, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"pending" | "shown">("pending");

  useEffect(() => {
    // Signal JS is active so CSS can hide pending reveal blocks. Without this, a hydration
    // failure would leave ~28 below-the-fold blocks stuck at opacity:0 (globals.css gates the
    // hide rule on `.reveal-ready`). Idempotent across all Reveal instances.
    document.documentElement.classList.add("reveal-ready");
    // Reduced motion: nothing to animate. The CSS only hides pending blocks under
    // `prefers-reduced-motion: no-preference`, so the content is already fully visible.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setState("shown");
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      id={id}
      className={["reveal", className].filter(Boolean).join(" ")}
      data-reveal={state}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
