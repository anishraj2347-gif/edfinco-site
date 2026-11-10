import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingCta from "@/components/FloatingCta";
import HeroArt from "@/components/HeroArt";
import JsonLd from "@/components/JsonLd";
import Model3D from "@/components/Model3D";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
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
} from "@/components/Icons";
import styles from "./home.module.css";

const trustIcons = [IconHeart, IconScale, IconLock, IconChat];
const categoryIcons = [IconBank, IconLayers, IconGlobe];
const serviceIcons = [IconBank, IconClipboard, IconCompass];

export default function HomePage() {
  const c = HOME;

  return (
    <>
      <div id="top" />
      <Header />
      <main id="main">
        {/* ---------------------------------------------------------- HERO */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroText}>
              <span className="eyebrow">{c.hero.eyebrow}</span>
              <h1 id="hero-title" className={styles.heroTitle}>
                {c.hero.headlineLine1}
                <br />
                <span className={styles.heroAccent}>{c.hero.headlineLine2}</span>
              </h1>
              {/* Real client tagline as a sub-line (not the H1) */}
              <p className={styles.heroTagline}>{c.hero.tagline}</p>
              <p className={styles.heroSubhead}>{c.hero.subhead}</p>
              <p className={styles.heroBody}>{c.hero.body}</p>

              <ul className={`chips ${styles.heroChips}`}>
                {c.hero.chips.map((chip) => (
                  <li key={chip} className="chip">
                    <IconCheck width={16} height={16} aria-hidden="true" />
                    {chip}
                  </li>
                ))}
              </ul>

              <div className={styles.heroCtas}>
                <a href={c.hero.ctaPrimary.href} className="btn btn-primary">
                  {c.hero.ctaPrimary.label}
                  <IconArrowRight width={18} height={18} />
                </a>
                <a href={c.hero.ctaSecondary.href} className="btn btn-ghost">
                  {c.hero.ctaSecondary.label}
                </a>
              </div>

              {/* Compliance spine (1 of 5): not-a-lender badge */}
              <p className={styles.notALender}>
                <IconShield width={18} height={18} aria-hidden="true" />
                <span>{c.hero.notALenderBadge}</span>
              </p>
            </div>

            <div className={styles.heroArt}>
              {/* Badge copy sourced from the stats band (offering facts, not outcomes) */}
              <HeroArt badges={[c.stats[0], c.stats[2]]} />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- TRUST STRIP */}
        <section className={`section ${styles.trust}`} aria-labelledby="trust-title">
          <div className="container">
            <h2 id="trust-title" className={styles.trustHeading}>
              {c.trust.heading}
            </h2>
            <div className={styles.trustLayout}>
              <Reveal className={styles.trustMedia}>
                <Image
                  src="/photos/trust.jpg"
                  alt="Two people planning together at a table with a laptop and notebook"
                  width={800}
                  height={800}
                  sizes="(max-width: 860px) 360px, 460px"
                  quality={85}
                />
              </Reveal>
              <div className={styles.trustItems}>
                {c.trust.items.map((item, i) => {
                  const Icon = trustIcons[i] ?? IconCheck;
                  return (
                    <Reveal
                      as="article"
                      key={item.title}
                      className={`card ${styles.trustCard}`}
                      delay={i * 80}
                    >
                      <span className={styles.trustIcon} aria-hidden="true">
                        <Icon width={22} height={22} />
                      </span>
                      <h3 className={styles.cardTitle}>{item.title}</h3>
                      <p className={styles.cardBody}>{item.body}</p>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- STATS STRIP */}
        <section className={styles.stats} aria-label="EdFinco at a glance">
          <div className={`container ${styles.statsRow}`}>
            {c.stats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <CountUp value={stat.value} className={styles.statValue} />
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
          {/* Non-committal funding-gap line (we estimate; the lender decides figures) */}
          <p className={`container ${styles.statsNote}`}>{c.fundingGapNote}</p>
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
            <Reveal className={styles.platformMedia}>
              <Model3D radius="var(--r-xl)">
                <Image
                  src="/photos/platform.jpg"
                  alt="A young man researching and comparing options on his laptop while taking notes"
                  width={1200}
                  height={900}
                  sizes="(max-width: 820px) 100vw, 760px"
                  quality={85}
                />
              </Model3D>
            </Reveal>
            <div className="grid grid-3">
              {c.platform.categories.map((cat, i) => {
                const Icon = categoryIcons[i] ?? IconBank;
                return (
                  <Reveal
                    as="article"
                    key={cat.name}
                    className={`card ${styles.lenderCard}`}
                    delay={i * 80}
                  >
                    <span className="codeBadge" aria-hidden="true">
                      <Icon width={24} height={24} />
                    </span>
                    <h3 className={styles.cardTitle}>{cat.name}</h3>
                    <p className={styles.cardBody}>{cat.body}</p>
                  </Reveal>
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
        <section className="section" aria-labelledby="advisory-title">
          <div className="container">
            <Reveal className={styles.advisory}>
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
                  <Model3D radius="var(--r-lg)">
                    <Image
                      src="/photos/advisor-meeting.jpg"
                      alt="An advisor walking two young adults through the numbers with a calculator and documents"
                      width={1200}
                      height={900}
                      sizes="(max-width: 820px) 440px, 400px"
                      quality={85}
                    />
                  </Model3D>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------- HOW IT WORKS */}
        <section id="how-it-works" className={`section ${styles.howSection}`} aria-labelledby="how-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.howItWorks.section.eyebrow}</span>
              <h2 id="how-title" className="h2">
                {c.howItWorks.section.heading}
              </h2>
              <p className="subhead">{c.howItWorks.section.subhead}</p>
            </div>
            <Reveal className={styles.howMedia}>
              <Model3D radius="var(--r-xl)">
                <Image
                  src="/photos/how.jpg"
                  alt="Filling in an application form at a desk beside a laptop"
                  width={1600}
                  height={900}
                  sizes="(max-width: 980px) 100vw, 920px"
                  quality={85}
                />
              </Model3D>
            </Reveal>
            <ol className={styles.steps}>
              {c.howItWorks.steps.map((step, i) => (
                <Reveal as="li" key={step.title} className={styles.step} delay={i * 60}>
                  <span className={styles.stepNum} aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className={styles.cardTitle}>{step.title}</h3>
                    <p className={styles.cardBody}>{step.body}</p>
                  </div>
                </Reveal>
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
                  <Reveal
                    as="article"
                    key={service.title}
                    className={`card ${styles.serviceCard}`}
                    delay={i * 80}
                  >
                    <span className="codeBadge" aria-hidden="true">
                      <Icon width={24} height={24} />
                    </span>
                    <h3 className={styles.cardTitle}>{service.title}</h3>
                    <p className={styles.cardBody}>{service.body}</p>
                  </Reveal>
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
        <section id="collateral" className="section" aria-labelledby="collateral-title">
          <div className="container">
            <div className="sectionHead center">
              <span className="eyebrow">{c.collateral.section.eyebrow}</span>
              <h2 id="collateral-title" className="h2">
                {c.collateral.section.heading}
              </h2>
              <p className="subhead">{c.collateral.section.subhead}</p>
            </div>
            <div className={styles.collateralLayout}>
              <Reveal className={styles.collateralMedia}>
                <Model3D radius="var(--r-lg)">
                  <Image
                    src="/photos/collateral.jpg"
                    alt="A couple reviewing financial documents together at home"
                    width={1200}
                    height={900}
                    sizes="(max-width: 820px) 100vw, 480px"
                    quality={85}
                  />
                </Model3D>
              </Reveal>
              <div className={styles.collateralCards}>
                {c.collateral.cards.map((card, i) => (
                  <Reveal
                    as="article"
                    key={card.title}
                    className={`card ${styles.collateralCard}`}
                    delay={i * 90}
                  >
                    <h3 className={styles.cardTitle}>{card.title}</h3>
                    <p className={styles.cardBody}>{card.body}</p>
                  </Reveal>
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
              {c.destinations.items.map((dest, i) => (
                <Reveal
                  as="article"
                  key={dest.name}
                  className={`card ${styles.destCard}`}
                  delay={(i % 4) * 70}
                >
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
                </Reveal>
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
              <Reveal className={styles.whyMedia}>
                <Model3D radius="var(--r-lg)">
                  <Image
                    src="/photos/why.jpg"
                    alt="A proud mother congratulating her daughter on graduation day"
                    width={1000}
                    height={1000}
                    sizes="(max-width: 860px) 340px, 400px"
                    quality={85}
                  />
                </Model3D>
              </Reveal>
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
              <Reveal className={styles.finalMedia}>
                <Image
                  src="/photos/final-cta.jpg"
                  alt="Graduates in gowns throwing their caps in the air"
                  width={1600}
                  height={900}
                  sizes="(max-width: 720px) 100vw, 680px"
                  quality={85}
                />
              </Reveal>
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
