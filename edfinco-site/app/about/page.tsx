import type { Metadata } from "next";
import { connection } from "next/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { IconArrowRight, IconCheck, IconX, IconShield } from "@/components/Icons";
import { ABOUT } from "@/lib/content";
import styles from "./about.module.css";

const a = ABOUT;

export const metadata: Metadata = {
  title: a.seo.title,
  description: a.seo.description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: a.seo.title,
    description: a.seo.description,
    url: a.seo.canonical,
    type: "website",
  },
};

export default async function AboutPage() {
  // Dynamic render so the strict-CSP per-request nonce (proxy.ts) is injected for the
  // client Header's hydration scripts. Matches /consultation.
  await connection();

  return (
    <>
      <div id="top" />
      <Header />
      <main id="main">
        {/* ------------------------------------------------------- HERO */}
        <section className={styles.hero} aria-labelledby="about-title">
          <div className="container">
            <span className={styles.heroEyebrow}>{a.hero.eyebrow}</span>
            <h1 id="about-title" className={styles.heroTitle}>
              {a.hero.heading}
            </h1>
            <p className={styles.heroSubhead}>{a.hero.subhead}</p>
            {/* Compliance spine: EdFinco is not a lender */}
            <p className={styles.notALenderBadge}>
              <IconShield width={18} height={18} aria-hidden="true" />
              <span>{a.hero.notALenderBadge}</span>
            </p>
          </div>
        </section>

        {/* -------------------------------------------------- WHO WE ARE */}
        <section className="section" aria-labelledby="who-title">
          <div className={`container ${styles.prose}`}>
            <h2 id="who-title" className="h2">
              {a.who.heading}
            </h2>
            {a.who.body.map((para) => (
              <p key={para} className={styles.proseBody}>
                {para}
              </p>
            ))}
            {/* Owner action required: add verified "about" facts (year founded, students helped,
                office address, team) only once the owner confirms them — never invent them. */}
          </div>
        </section>

        {/* ---------------------------------------------------- WHAT WE DO */}
        <section className={`section ${styles.alt}`} aria-labelledby="what-title">
          <div className="container">
            <div className="sectionHead">
              <h2 id="what-title" className="h2">
                {a.what.heading}
              </h2>
              <p className="subhead">{a.what.subhead}</p>
            </div>
            <ul className={`grid grid-4 ${styles.pillars}`}>
              {a.what.pillars.map((pillar) => (
                <li key={pillar.title} className="card">
                  <span className={styles.pillarIcon} aria-hidden="true">
                    <IconCheck width={22} height={22} />
                  </span>
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarBody}>{pillar.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* -------------------------------------------------- DESTINATIONS */}
        <section className="section" aria-labelledby="dest-title">
          <div className="container">
            <div className="sectionHead">
              <h2 id="dest-title" className="h2">
                {a.destinations.heading}
              </h2>
              <p className="subhead">{a.destinations.subhead}</p>
            </div>
            <ul className={`chips ${styles.destChips}`}>
              {a.destinations.names.map((name) => (
                <li key={name} className="chip">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------- CAN / CAN'T */}
        <section className={`section ${styles.alt}`} aria-labelledby="honest-title">
          <div className="container">
            <h2 id="honest-title" className={`h2 ${styles.honestHeading}`}>
              Honest about what we can — and can&rsquo;t — do
            </h2>
            <div className="grid grid-2">
              <div className="card">
                <h3 className={styles.canHeading}>{a.can.heading}</h3>
                <ul className={styles.canList}>
                  {a.can.items.map((item) => (
                    <li key={item} className={styles.canItem}>
                      <span className={`${styles.marker} ${styles.markerCan}`} aria-hidden="true">
                        <IconCheck width={16} height={16} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 className={styles.cantHeading}>{a.cant.heading}</h3>
                <ul className={styles.canList}>
                  {a.cant.items.map((item) => (
                    <li key={item} className={styles.canItem}>
                      <span className={`${styles.marker} ${styles.markerCant}`} aria-hidden="true">
                        <IconX width={16} height={16} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Compliance spine near the close. */}
            <p className={`notice ${styles.notALenderLine}`}>{a.notALenderLine}</p>
          </div>
        </section>

        {/* ----------------------------------------------------- CTA BAND */}
        <section className={styles.ctaBand} aria-labelledby="about-cta-title">
          <div className={`container ${styles.ctaInner}`}>
            <h2 id="about-cta-title" className={styles.ctaHeading}>
              {a.cta.heading}
            </h2>
            <p className={styles.ctaBody}>{a.cta.body}</p>
            <a href={a.cta.primary.href} className="btn btn-primary">
              {a.cta.primary.label}
              <IconArrowRight width={18} height={18} />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
