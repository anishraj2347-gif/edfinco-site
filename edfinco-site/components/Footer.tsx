import Image from "next/image";
import Link from "next/link";
import { HOME, SITE } from "@/lib/content";
import styles from "./footer.module.css";

// Internal site pages (next/link, same-origin). Legal pages are templates pending lawyer review.
const LEGAL_LINKS = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandCol}>
          <span className={styles.brand}>
            <Image
              src="/logo.png"
              alt={SITE.name}
              width={1500}
              height={334}
              sizes="170px"
              className={styles.logoImg}
            />
          </span>
          <p className={styles.tagline}>{SITE.tagline}</p>
          <p className={styles.contact}>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <br />
            <a href={SITE.instagramUrl} rel="noopener noreferrer" target="_blank">
              {SITE.instagram}
            </a>
          </p>
        </div>

        <nav className={styles.linkCol} aria-label="Footer">
          <h2 className={styles.colHeading}>Explore</h2>
          <ul>
            {HOME.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.linkCol}>
          <h2 className={styles.colHeading}>Get started</h2>
          <ul>
            <li>
              <a href={HOME.primaryCta.href}>{HOME.primaryCta.label}</a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`}>Email us a question</a>
            </li>
          </ul>
        </div>

        <nav className={styles.linkCol} aria-label="Company and legal">
          <h2 className={styles.colHeading}>Company &amp; legal</h2>
          <ul>
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Inner wrapper so the divider line lines up with the content, not the container padding. */}
      <div className="container">
        <div className={styles.disclaimerWrap}>
          {/* Compliance spine (5 of 5): "EdFinco is not a lender" — site-wide. */}
          <p className={styles.disclaimer}>{HOME.footerDisclaimer}</p>
          {/* Legal name comes from SITE.legalEntity (owner confirmed "EdFinco", 2026-11-10). Owner action
              still required: any regulatory/disclosure text before launch (docs/homepage-spec.md #1). */}
          {SITE.legalEntity ? (
            <p className={styles.copyright}>
              © {year} {SITE.legalEntity}. All rights reserved.
            </p>
          ) : (
            <p className={styles.copyright}>
              © {year} {SITE.name}.{" "}
              <span className={styles.ownerNote}>[Registered legal entity name to be added]</span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
