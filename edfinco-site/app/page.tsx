import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingCta from "@/components/FloatingCta";
import HeroArt from "@/components/HeroArt";
import JsonLd from "@/components/JsonLd";
import { HOME } from "@/lib/content";
import {
  IconArrowRight,
  IconCheck,
  IconHeart,
  IconScale,
  IconLock,
  IconChat,
  IconBank,
  IconLayers,
  IconGlobe,
  IconShield,
  IconClipboard,
  IconCompass,
  IconPercent,
  IconClock,
  IconCap,
  IconHome,
  IconCheckCircle,
} from "@/components/Icons";
import styles from "./home.module.css";

const trustIcons = [IconHeart, IconScale, IconLock, IconChat];
const categoryIcons = [IconBank, IconLayers, IconGlobe];
const serviceIcons = [IconBank, IconClipboard, IconCompass];
// One icon per hero highlight, in HOME.hero.highlights order.
const highlightIcons = [IconPercent, IconClock, IconCap, IconHome, IconCheckCircle];

export default function HomePage() {
  const c = HOME;
  // Destination photos for the hero proof row (USA, UK, Australia).
  const proofDestinations = [0, 2, 4].map((i) => c.destinations.items[i]).filter(Boolean);

  return (
    <>
      <div id="top" />
      <Header />
      <main id="main">
        {/* ---------------------------------------------------------- HERO */}
        {/* Layout follows the client's reference (change doc 2026-11-12, item 6): light background,
            big headline, two CTAs and a proof row on the left; a cut-out photo over brand bands on
            the right; the client's key points (item 4) in a strip underneath. */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroText}>
              <h1 id="hero-title" className={styles.heroTitle}>
                {c.hero.headlineLine1}
                <br />
                <span className={styles.heroAccent}>{c.hero.headlineLine2}</span>
              </h1>
              <p className={styles.heroTagline}>{c.hero.tagline}</p>
              <p className={styles.heroLead}>{c.hero.lead}</p>

              <div className={styles.heroCtas}>
                <a href={c.hero.ctaPrimary.href} className="btn btn-primary">
                  {c.hero.ctaPrimary.label}
                  <IconArrowRight width={18} height={18} />
                </a>
                <a href={c.hero.ctaSecondary.href} className="btn btn-secondary">
                  {c.hero.ctaSecondary.label}
                </a>
              </div>

              <div className={styles.heroProof}>
                <div className={styles.proofFaces} aria-hidden="true">
                  {proofDestinations.map((dest) => (
                    <Image
                      key={dest.name}
                      src={dest.image.src}
                      alt=""
                      width={96}
                      height={96}
                      sizes="44px"
                      className={styles.proofFace}
                    />
                  ))}
                  <span className={styles.proofCount}>{c.hero.proof.value}</span>
                </div>
                <p className={styles.proofText}>
                  <strong>{c.hero.proof.title}</strong> {c.hero.proof.body}
                </p>
              </div>
            </div>

            <div className={styles.heroArt}>
              <HeroArt badges={c.hero.badges} />
            </div>
          </div>

          {/* Client key points. Claims marked "*" ship with their footnote (lib/content.ts). */}
          <div className="container">
            <div className={styles.highlights}>
              <ul className={styles.highlightList}>
                {c.hero.highlights.map((text, i) => {
                  const Icon = highlightIcons[i] ?? IconCheck;
                  return (
                    <li key={text} className={styles.highlight}>
                      <span className={styles.highlightIcon} aria-hidden="true">
                        <Icon width={22} height={22} />
                      </span>
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.highlightsNote}>{c.hero.highlightsNote}</p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- INTRO */}
        <section className={styles.intro} aria-label="What EdFinco does">
          <div className={`container ${styles.introInner}`}>
            <p className={styles.introLead}>
              <strong>{c.intro.leadStrong}</strong> {c.intro.leadRest}
            </p>
            <p className={styles.introBody}>{c.intro.body}</p>
            <p className={styles.introClosing}>{c.intro.closing}</p>
            {/* Compliance spine (1 of 5): not-a-lender badge */}
            <p className={styles.notALender}>
              <IconShield width={18} height={18} aria-hidden="true" />
              <span>{c.intro.notALenderBadge}</span>
            </p>
          </div>
        </section>

        {/* ----------------------------------------------- HOW IT WORKS */}
        {/* Swapped with the "Honest help" strip (client change doc, item 5). */}
        <section id="how-it-works" className={`section ${styles.howSection}`} aria-labelledby="how-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.howItWorks.section.eyebrow}</span>
              <h2 id="how-title" className="h2">
                {c.howItWorks.section.heading}
              </h2>
              <p className="subhead">{c.howItWorks.section.subhead}</p>
            </div>
            <div className={styles.howMedia}>
              <Image
                src="/photos/how.jpg"
                alt="Filling in an application form at a desk beside a laptop"
                width={1600}
                height={900}
                sizes="(max-width: 980px) 100vw, 920px"
                quality={85}
              />
            </div>
            <ol className={styles.steps}>
              {c.howItWorks.steps.map((step, i) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className={styles.cardTitle}>{step.title}</h3>
                    <p className={styles.cardBody}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className={styles.centerCta}>
              <a href={c.howItWorks.cta.href} className="btn btn-primary">
                {c.howItWorks.cta.label}
                <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- STATS STRIP */}
        <section className={styles.stats} aria-label="EdFinco at a glance">
          <div className={`container ${styles.statsRow}`}>
            {c.stats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
          {/* Funding-gap message (client change doc, item 7) */}
          <div className="container">
            <div className={styles.fundingGap}>
              <h2 className={styles.fundingGapTitle}>{c.fundingGap.heading}</h2>
              <p className={styles.fundingGapBody}>{c.fundingGap.body}</p>
            </div>
          </div>
        </section>

        {/* ------------------------------------- ONE PLATFORM, MANY LENDERS */}
        <section id="lenders" className="section" aria-labelledby="lenders-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.platform.section.eyebrow}</span>
              <h2 id="lenders-title" className="h2">
                {c.platform.section.heading}
              </h2>
              <p className="subhead">{c.platform.section.subhead}</p>
            </div>
            <div className={styles.platformMedia}>
              <Image
                src="/photos/platform.jpg"
                alt="A young man researching and comparing options on his laptop while taking notes"
                width={1200}
                height={900}
                sizes="(max-width: 820px) 100vw, 760px"
                quality={85}
              />
            </div>
            <div className="grid grid-3">
              {c.platform.categories.map((cat, i) => {
                const Icon = categoryIcons[i] ?? IconBank;
                return (
                  <article key={cat.name} className={`card ${styles.lenderCard}`}>
                    <span className="codeBadge" aria-hidden="true">
                      <Icon width={24} height={24} />
                    </span>
                    <h3 className={styles.cardTitle}>{cat.name}</h3>
                    <p className={styles.cardBody}>{cat.body}</p>
                  </article>
                );
              })}
            </div>
            {/* Mandatory compliance line: lender decides */}
            <p className={`notice ${styles.lenderNotice}`}>{c.platform.lenderDecidesLine}</p>
            <div className={styles.centerCta}>
              <a href={c.platform.cta.href} className="btn btn-primary">
                {c.platform.cta.label}
                <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>

        {/* --------------------------------------------- ADVISORY CALLOUT */}
        <section className={`section ${styles.flushTop}`} aria-labelledby="advisory-title">
          <div className="container">
            <div className={styles.advisory}>
              <div className={styles.advisoryGrid}>
                <div className={styles.advisoryInner}>
                  <span className={styles.advisoryEyebrow}>{c.advisory.eyebrow}</span>
                  <h2 id="advisory-title" className={styles.advisoryTitle}>
                    {c.advisory.heading}
                  </h2>
                  <p className={styles.advisoryBody}>{c.advisory.body}</p>
                  <div className={styles.heroCtas}>
                    <a href={c.advisory.ctaPrimary.href} className="btn btn-primary">
                      {c.advisory.ctaPrimary.label}
                      <IconArrowRight width={18} height={18} />
                    </a>
                    <a href={c.advisory.ctaSecondary.href} className="btn btn-ghost">
                      {c.advisory.ctaSecondary.label}
                    </a>
                  </div>
                </div>
                <div className={styles.advisoryMedia}>
                  <Image
                    src="/photos/advisor-meeting.jpg"
                    alt="An advisor walking two young adults through the numbers with a calculator and documents"
                    width={1200}
                    height={900}
                    sizes="(max-width: 820px) 440px, 400px"
                    quality={85}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- TRUST STRIP */}
        {/* Swapped with "How it works" (client change doc, item 5). */}
        <section className={`section ${styles.trust}`} aria-labelledby="trust-title">
          <div className="container">
            <h2 id="trust-title" className={styles.trustHeading}>
              {c.trust.heading}
            </h2>
            <div className={styles.trustLayout}>
              <div className={styles.trustMedia}>
                <Image
                  src="/photos/trust.jpg"
                  alt="Two people planning together at a table with a laptop and notebook"
                  width={800}
                  height={800}
                  sizes="(max-width: 860px) 360px, 460px"
                  quality={85}
                />
              </div>
              <div className={styles.trustItems}>
                {c.trust.items.map((item, i) => {
                  const Icon = trustIcons[i] ?? IconCheck;
                  return (
                    <article key={item.title} className={`card ${styles.trustCard}`}>
                      <span className={styles.trustIcon} aria-hidden="true">
                        <Icon width={22} height={22} />
                      </span>
                      <h3 className={styles.cardTitle}>{item.title}</h3>
                      <p className={styles.cardBody}>{item.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------- WHAT WE HELP WITH */}
        {/* Consultation confirmed free by the owner (2026-11-10). Owner action still required:
            reconcile "at no extra cost" with any processing fee before launch. */}
        <section id="what-we-help-with" className="section" aria-labelledby="help-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.helpWith.section.eyebrow}</span>
              <h2 id="help-title" className="h2">
                {c.helpWith.section.heading}
              </h2>
              <p className="subhead">{c.helpWith.section.subhead}</p>
            </div>
            <div className="grid grid-3">
              {c.helpWith.services.map((service, i) => {
                const Icon = serviceIcons[i] ?? IconCheck;
                return (
                  <article key={service.title} className={`card ${styles.serviceCard}`}>
                    <span className="codeBadge" aria-hidden="true">
                      <Icon width={24} height={24} />
                    </span>
                    <h3 className={styles.cardTitle}>{service.title}</h3>
                    <p className={styles.cardBody}>{service.body}</p>
                  </article>
                );
              })}
            </div>
            <div className={styles.centerCta}>
              <a href={c.helpWith.cta.href} className="btn btn-primary">
                {c.helpWith.cta.label}
                <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>

        {/* ----------------------------------------- COLLATERAL EXPLAINER */}
        <section id="collateral" className={`section ${styles.flushTop}`} aria-labelledby="collateral-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.collateral.section.eyebrow}</span>
              <h2 id="collateral-title" className="h2">
                {c.collateral.section.heading}
              </h2>
              <p className="subhead">{c.collateral.section.subhead}</p>
            </div>
            <div className={styles.collateralLayout}>
              <div className={styles.collateralMedia}>
                <Image
                  src="/photos/collateral.jpg"
                  alt="A couple reviewing financial documents together at home"
                  width={1200}
                  height={900}
                  sizes="(max-width: 820px) 100vw, 480px"
                  quality={85}
                />
              </div>
              <div className={styles.collateralCards}>
                {c.collateral.cards.map((card) => (
                  <article key={card.title} className={`card ${styles.collateralCard}`}>
                    <h3 className={styles.cardTitle}>{card.title}</h3>
                    <p className={styles.cardBody}>{card.body}</p>
                  </article>
                ))}
              </div>
            </div>
            {/* MANDATORY collateral caveat */}
            <p className={`notice ${styles.caveat}`}>
              <strong>Important:</strong> {c.collateral.caveat}
            </p>
            <div className={styles.centerCta}>
              <a href={c.collateral.cta.href} className="btn btn-primary">
                {c.collateral.cta.label}
                <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- DESTINATIONS */}
        <section id="destinations" className={`section ${styles.destSection}`} aria-labelledby="dest-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.destinations.section.eyebrow}</span>
              <h2 id="dest-title" className="h2">
                {c.destinations.section.heading}
              </h2>
              <p className="subhead">{c.destinations.section.subhead}</p>
            </div>
            <div className="grid grid-4">
              {c.destinations.items.map((dest) => (
                <article key={dest.name} className={`card ${styles.destCard}`}>
                  <div className={styles.destImg}>
                    <Image
                      src={dest.image.src}
                      alt={dest.image.alt}
                      width={240}
                      height={240}
                      sizes="(max-width: 560px) 100vw, (max-width: 900px) 45vw, 240px"
                    />
                  </div>
                  <h3 className={styles.destName}>{dest.name}</h3>
                  <p className={styles.cardBody}>{dest.reason}</p>
                </article>
              ))}
            </div>
            <div className={styles.centerCta}>
              <a href={c.destinations.cta.href} className="btn btn-primary">
                {c.destinations.cta.label}
                <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- WHY EDFINCO */}
        <section className="section" aria-labelledby="why-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.why.section.eyebrow}</span>
              <h2 id="why-title" className="h2">
                {c.why.section.heading}
              </h2>
              <p className="subhead">{c.why.section.subhead}</p>
            </div>

            <div className={styles.whyLayout}>
              <div className={styles.whyMedia}>
                <Image
                  src="/photos/why.jpg"
                  alt="A proud mother congratulating her daughter on graduation day"
                  width={1000}
                  height={1000}
                  sizes="(max-width: 860px) 340px, 400px"
                  quality={85}
                />
              </div>
              {/* Real <table> so header↔cell associations survive at every breakpoint (the
                  responsive stacked look is pure CSS). Explicit ARIA roles are kept because the
                  rows are laid out with CSS grid, and changing the display of table elements can
                  otherwise drop their implicit table semantics in some browsers. */}
              <table className={styles.compare} role="table">
                <caption className="sr-only">
                  How working with EdFinco compares with approaching lenders on your own
                </caption>
                <thead role="rowgroup">
                  <tr role="row" className={`${styles.compareRow} ${styles.compareHead}`}>
                    <th role="columnheader" scope="col" className={styles.compareTopic}>
                      <span className="sr-only">What changes</span>
                    </th>
                    <th role="columnheader" scope="col" className={styles.compareWith}>
                      {c.why.columns.withEdfinco}
                    </th>
                    <th role="columnheader" scope="col" className={styles.compareAlone}>
                      {c.why.columns.onYourOwn}
                    </th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {c.why.rows.map((row) => (
                    <tr role="row" key={row.topic} className={styles.compareRow}>
                      <th role="rowheader" scope="row" className={styles.compareTopic}>
                        {row.topic}
                      </th>
                      <td role="cell" className={styles.compareWith}>
                        <IconCheck width={18} height={18} aria-hidden="true" />
                        <span>{row.withEdfinco}</span>
                      </td>
                      <td role="cell" className={styles.compareAlone}>
                        {row.onYourOwn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compliance spine (3 of 5) */}
            <p className={`notice ${styles.lenderNotice}`}>{c.why.notALenderLine}</p>
            <div className={styles.centerCta}>
              <a href={c.why.cta.href} className="btn btn-primary">
                {c.why.cta.label}
                <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------- STRAIGHT FACTS / FAQ */}
        <section id="faq" className={`section ${styles.faqSection}`} aria-labelledby="faq-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.faq.eyebrow}</span>
              <h2 id="faq-title" className="h2">
                {c.faq.heading}
              </h2>
            </div>
            <div className={styles.faqList}>
              {c.faq.items.map((item) => (
                <details key={item.q} className={styles.faqItem}>
                  <summary className={styles.faqQ}>
                    <span>{item.q}</span>
                    <span className={styles.faqChevron} aria-hidden="true" />
                  </summary>
                  <div className={styles.faqA}>
                    <p>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
            <div className={styles.centerCta}>
              <a href={c.faq.cta.href} className="btn btn-primary">
                {c.faq.cta.label}
                <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- FINAL CTA */}
        <section className="section" aria-labelledby="final-title">
          <div className="container">
            <div className={styles.finalCta}>
              <div className={styles.finalMedia}>
                <Image
                  src="/photos/final-cta.jpg"
                  alt="Graduates in gowns throwing their caps in the air"
                  width={1600}
                  height={900}
                  sizes="(max-width: 720px) 100vw, 680px"
                  quality={85}
                />
              </div>
              <span className={styles.finalEyebrow}>{c.finalCta.eyebrow}</span>
              <h2 id="final-title" className={styles.finalTitle}>
                {c.finalCta.heading}
              </h2>
              <p className={styles.finalSubhead}>{c.finalCta.subhead}</p>
              <div className={styles.heroCtas}>
                <a href={c.finalCta.ctaPrimary.href} className="btn btn-primary">
                  {c.finalCta.ctaPrimary.label}
                  <IconArrowRight width={18} height={18} />
                </a>
                <a href={c.finalCta.ctaSecondary.href} className="btn btn-ghost">
                  {c.finalCta.ctaSecondary.label}
                </a>
              </div>
              <p className={styles.finalReassurance}>{c.finalCta.reassurance}</p>
              {/* Compliance spine (4 of 5) */}
              <p className={styles.finalNotALender}>{c.finalCta.notALenderLine}</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingCta />
      <JsonLd />
    </>
  );
}
