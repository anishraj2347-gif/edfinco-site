// Hero visual. Layout follows the client's reference (change doc 2026-11-12, item 6): the student,
// cut out of his Pexels photo (background removed locally, see public/photos/CREDITS.md), stands in
// front of slanted brand-colour bands, with two fact cards on top (static: no animation, owner
// request 2026-11-12). Server component, CSP-safe
// (same-origin image via the Next optimizer, inline SVG only). Card copy comes from lib/content.ts;
// the cards are aria-hidden because the same facts are in the stats band.
import Image from "next/image";
import type { HeroBadge } from "@/lib/content";
import styles from "./heroArt.module.css";

function Badge({ badge, className }: { badge: HeroBadge; className: string }) {
  return (
    <div className={`${styles.badge} ${className}`} aria-hidden="true">
      {badge.pre && <span className={styles.badgeLabel}>{badge.pre}</span>}
      <span className={styles.badgeValue}>{badge.value}</span>
      {badge.label && <span className={styles.badgeLabel}>{badge.label}</span>}
    </div>
  );
}

export default function HeroArt({ badges = [] }: { badges?: HeroBadge[] }) {
  return (
    <div className={styles.wrap}>
      {/* Brand bands (decorative). viewBox matches the 5:6 frame. */}
      <svg className={styles.bands} viewBox="0 0 500 600" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="heroBandForest" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#0c2b1e" />
            <stop offset="1" stopColor="#1d5a40" />
          </linearGradient>
          <linearGradient id="heroBandEmerald" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#0f766e" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <polygon points="8,600 62,452 128,452 74,600" fill="#f59e0b" />
        <polygon points="78,600 262,118 452,118 268,600" fill="url(#heroBandForest)" />
        <polygon points="318,600 434,296 520,296 404,600" fill="url(#heroBandEmerald)" />
      </svg>

      <Image
        src="/photos/hero-cutout.webp"
        alt="A smiling student with a backpack and books"
        width={1000}
        height={1437}
        sizes="(max-width: 900px) 300px, 420px"
        priority
        quality={85}
        className={styles.photo}
      />

      {badges[0] && <Badge badge={badges[0]} className={styles.badgeTop} />}
      {badges[1] && <Badge badge={badges[1]} className={styles.badgeBottom} />}
    </div>
  );
}
