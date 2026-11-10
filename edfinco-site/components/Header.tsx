"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HOME, SITE } from "@/lib/content";
import { IconArrowRight } from "./Icons";
import styles from "./header.module.css";

export default function Header() {
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu on Escape and return focus to the toggle (keyboard a11y).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className={styles.header}>
      <a href="#main" className="skipLink">
        Skip to content
      </a>
      <p className={styles.announce}>{HOME.announcement}</p>
      <div className={`container ${styles.bar}`}>
        <Link href="/#top" className={styles.brand} aria-label={`${SITE.name} home`}>
          <Image
            src="/logo.png"
            alt=""
            width={1500}
            height={334}
            priority
            sizes="180px"
            className={styles.logoImg}
          />
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navList}>
            {HOME.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <a href={HOME.primaryCta.href} className={`btn btn-primary ${styles.cta}`}>
            {HOME.primaryCta.label}
            <IconArrowRight width={18} height={18} />
          </a>
          <button
            ref={burgerRef}
            type="button"
            className={styles.burger}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={styles.burgerBar} data-open={open} />
            <span className={styles.burgerBar} data-open={open} />
            <span className={styles.burgerBar} data-open={open} />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={styles.mobileNav}
        data-open={open}
        hidden={!open}
      >
        <ul className={styles.mobileList}>
          {HOME.nav.map((item) => (
            <li key={item.href}>
              <a href={item.href} className={styles.mobileLink} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href={HOME.primaryCta.href}
              className={`btn btn-primary ${styles.mobileCta}`}
              onClick={() => setOpen(false)}
            >
              {HOME.primaryCta.label}
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
