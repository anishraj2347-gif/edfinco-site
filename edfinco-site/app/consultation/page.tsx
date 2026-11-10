import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConsultationForm from "@/components/ConsultationForm";
import { IconCheck, IconShield } from "@/components/Icons";
import { CONSULTATION } from "@/lib/content";
import styles from "./consultation.module.css";

const c = CONSULTATION;

export const metadata: Metadata = {
  title: c.seo.title,
  description: c.seo.description,
  alternates: { canonical: "/consultation" },
  openGraph: {
    title: c.seo.title,
    description: c.seo.description,
    url: c.seo.canonical,
    type: "website",
  },
};

export default async function ConsultationPage() {
  // Nonce-based CSP (proxy.ts) requires dynamic rendering so Next injects the per-request
  // nonce into framework/page scripts; without it the client form would fail to hydrate
  // under the strict script-src. Matches the homepage (which is dynamic via JsonLd/headers()).
  await connection();

  return (
    <>
      <a id="top" />
      <Header />
      <main id="main">
        {/* ------------------------------------------------------ HERO BAND */}
        <section className={styles.hero} aria-labelledby="consult-title">
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroText}>
            <span className={styles.eyebrow}>{c.hero.eyebrow}</span>
            <h1 id="consult-title" className={styles.title}>
              {c.hero.heading}
            </h1>
            <p className={styles.subhead}>{c.hero.subhead}</p>
            <p className={styles.reassurance}>{c.hero.reassurance}</p>
            {/* Compliance spine: EdFinco is not a lender */}
            <p className={styles.notALender}>
              <IconShield width={18} height={18} aria-hidden="true" />
              <span>{c.hero.notALenderBadge}</span>
            </p>
            </div>
            <div className={styles.heroMedia}>
              <Image
                src="/photos/consult-call.jpg"
                alt="A young woman smiling and waving on a video call at her desk"
                width={960}
                height={1200}
                sizes="(max-width: 900px) 0px, 380px"
                priority
                quality={85}
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- FORM + SIDEBAR */}
        <section className={`section ${styles.body}`} aria-label="Consultation request">
          <div className={`container ${styles.layout}`}>
            {/* What to expect / trust strip */}
            <aside className={styles.sidebar} aria-labelledby="expect-title">
              <div className={styles.sidebarMedia}>
                <Image
                  src="/photos/consult-family.jpg"
                  alt="A couple smiling while planning together at home with a laptop and notebook"
                  width={1200}
                  height={800}
                  sizes="(max-width: 860px) 100vw, 420px"
                  quality={85}
                />
              </div>
              <h2 id="expect-title" className={styles.sidebarHeading}>
                {c.expectations.heading}
              </h2>
              <ul className={styles.expectList}>
                {c.expectations.items.map((item) => (
                  <li key={item.title} className={styles.expectItem}>
                    <span className={styles.expectIcon} aria-hidden="true">
                      <IconCheck width={18} height={18} />
                    </span>
                    <div>
                      <h3 className={styles.expectTitle}>{item.title}</h3>
                      <p className={styles.expectBody}>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Compliance spine near the form */}
              <p className={`notice ${styles.sidebarNotice}`}>{c.notALenderLine}</p>
            </aside>

            {/* The lead form */}
            <div className={`card ${styles.formCard}`}>
              <h2 className={styles.formHeading}>{c.form.heading}</h2>
              <ConsultationForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
