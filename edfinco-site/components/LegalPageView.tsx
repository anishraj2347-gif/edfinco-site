// Shared renderer for the /privacy, /terms and /disclaimer template pages.
// Server component (RSC) — no client JS. Content comes from lib/content.ts (typed), so no
// claims-sensitive copy is hardcoded here. Every legal page is a TEMPLATE pending lawyer review;
// the visible owner notice + bracketed [Owner action required: ...] placeholders make that clear.
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { IconShield } from "@/components/Icons";
import type { LegalPageContent } from "@/lib/content";
import styles from "./legal.module.css";

export default function LegalPageView({ page }: { page: LegalPageContent }) {
  return (
    <>
      <div id="top" />
      <Header />
      <main id="main">
        <section className={styles.hero} aria-labelledby="legal-title">
          <div className="container">
            <span className={styles.eyebrow}>{page.eyebrow}</span>
            <h1 id="legal-title" className={styles.title}>
              {page.heading}
            </h1>
            <p className={styles.intro}>{page.intro}</p>
          </div>
        </section>

        <section className={`section ${styles.body}`}>
          <div className={`container ${styles.layout}`}>
            {/* Owner action required: this is a template. A qualified lawyer must review and
                complete it (and fill every [Owner action required: ...] placeholder) before launch. */}
            <aside className={styles.ownerNotice} role="note" aria-label="Notice to site owner">
              <span className={styles.ownerNoticeIcon} aria-hidden="true">
                <IconShield width={20} height={20} />
              </span>
              <p className={styles.ownerNoticeText}>{page.ownerNotice}</p>
            </aside>

            <p className={styles.lastUpdated}>{page.lastUpdatedNote}</p>

            {page.sections.map((section) => (
              <section key={section.heading} className={styles.section}>
                <h2 className={styles.sectionHeading}>{section.heading}</h2>
                {section.body?.map((para) => (
                  <p key={para} className={styles.paragraph}>
                    {para}
                  </p>
                ))}
                {section.list && (
                  <ul className={styles.list}>
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* Compliance spine: EdFinco is not a lender. */}
            <p className={`notice ${styles.notALender}`}>{page.notALenderLine}</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
