// Hero visual — a real stock photo (Pexels, see public/photos/CREDITS.md) (same-origin, served by the Next image optimizer, CSP-safe) in a
// rounded frame with a soft shadow, decorative blurred emerald/gold blobs behind it, and two
// floating badges. Server component. Badge copy is passed in from lib/content.ts (no hardcoded
// claims here); badges are aria-hidden decoration that mirror the stats band below.
import Image from "next/image";
import styles from "./heroArt.module.css";

interface Badge {
  value: string;
  label: string;
}

export default function HeroArt({ badges = [] }: { badges?: Badge[] }) {
  return (
    <div className={styles.wrap}>
      <span className={`${styles.blob} ${styles.blobEmerald}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blobGold}`} aria-hidden="true" />

      <div className={styles.frame}>
        <Image
          src="/photos/hero.jpg"
          alt="A smiling student with a backpack and books on a university campus"
          width={1040}
          height={1300}
          sizes="(max-width: 880px) 320px, 440px"
          priority
          quality={85}
          className={styles.photo}
        />
      </div>

      {badges[0] && (
        <div className={`${styles.badge} ${styles.badgeTop}`} aria-hidden="true">
          <span className={styles.badgeValue}>{badges[0].value}</span>
          <span className={styles.badgeLabel}>{badges[0].label}</span>
        </div>
      )}
      {badges[1] && (
        <div className={`${styles.badge} ${styles.badgeBottom}`} aria-hidden="true">
          <span className={styles.badgeValue}>{badges[1].value}</span>
          <span className={styles.badgeLabel}>{badges[1].label}</span>
        </div>
      )}
    </div>
  );
}
