"use client";

// Animated stage for the section photos (platform, how, advisory, collateral, why) — real
// Pexels photos since 2026-11-10 (replaced the AI 3D renders; see public/photos/CREDITS.md).
// Motion layers — all decorative, aria-hidden, CSP-safe (no inline scripts; tilt uses CSSOM
// custom properties), and disabled under prefers-reduced-motion:
//   • glow   — soft gold/blue halo pulsing BEHIND the model
//   • shine  — a light sweep gliding across the model every few seconds (overlay layer)
//   • sparks — three small gold sparkles orbiting the model
//   • pop    — one-shot scale-in when the parent <Reveal> shows it
//   • tilt   — pointer-driven 3D tilt on hover (fine pointers only), eases back to flat
// The <img> itself is never left with a persistent transform at rest: a resting transform
// promotes it to a composited layer that blurs under Windows 125/150% display scaling.
import { useRef, type PointerEvent, type ReactNode } from "react";
import styles from "./model3d.module.css";

export default function Model3D({
  children,
  radius = "var(--r-lg)",
}: {
  children: ReactNode;
  radius?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
    el.dataset.tilt = "on";
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    delete el.dataset.tilt;
  }

  return (
    <div
      ref={ref}
      className={styles.stage}
      style={{ ["--m-r" as string]: radius }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className={styles.glow} aria-hidden="true" />
      <div className={styles.model}>
        {children}
        <span className={styles.shine} aria-hidden="true" />
      </div>
      <span className={`${styles.spark} ${styles.s1}`} aria-hidden="true" />
      <span className={`${styles.spark} ${styles.s2}`} aria-hidden="true" />
      <span className={`${styles.spark} ${styles.s3}`} aria-hidden="true" />
    </div>
  );
}
