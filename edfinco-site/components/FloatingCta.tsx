// Floating "Book a free consultation" button — on brand, always reachable.
// Pure anchor (no client JS). Hidden from assistive tech duplication via aria-label on a plain link.
import { HOME } from "@/lib/content";
import { IconChat } from "./Icons";
import styles from "./floatingCta.module.css";

export default function FloatingCta() {
  return (
    <a href={HOME.primaryCta.href} className={styles.fab} aria-label={HOME.primaryCta.label}>
      <IconChat width={20} height={20} />
      <span className={styles.label}>{HOME.primaryCta.label}</span>
    </a>
  );
}
