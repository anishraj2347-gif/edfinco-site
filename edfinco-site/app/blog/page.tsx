import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { after, connection } from "next/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { IconArrowRight } from "@/components/Icons";
import { CONSULT_HREF } from "@/lib/content";
import { getAllPosts, formatDate } from "@/lib/blog";
import { maybeTick } from "@/lib/server/tick";
import styles from "./blog.module.css";

const TITLE = "Blog — Study-abroad loan guides | EdFinco";
const DESCRIPTION =
  "Plain-English guides for Indian students and parents on education loans for studying abroad: collateral, co-borrowers, documents and cost planning.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/blog", type: "website" },
};

export default async function BlogIndexPage() {
  // Dynamic render: strict-CSP nonce (proxy.ts) + newly approved posts appear without a rebuild.
  await connection();
  const posts = await getAllPosts();
  // Backup for the hourly scheduler: a visit runs the tick if none ran in the last 10 minutes.
  after(() => maybeTick("blog visit"));
  const [featured, ...rest] = posts;

  return (
    <>
      <div id="top" />
      <Header />
      <main id="main">
        <section className={styles.hero} aria-labelledby="blog-title">
          <div className="container">
            <span className={styles.eyebrow}>EdFinco blog</span>
            <h1 id="blog-title" className={styles.heroTitle}>
              Straight answers for your study-abroad funding plan.
            </h1>
            <p className={styles.heroSub}>
              Plain-English guides on education loans, co-borrowers, documents and cost planning —
              written for students and the parents backing them, with new articles added regularly.
            </p>
          </div>
        </section>

        <section className={`section ${styles.listSection}`} aria-label="Articles">
          <div className="container">
            {posts.length === 0 && <p className={styles.empty}>New articles are on the way.</p>}

            {featured && (
              <Reveal as="article" className={styles.featured}>
                {featured.image && (
                  <Link href={`/blog/${featured.slug}`} className={styles.featuredMedia} tabIndex={-1} aria-hidden="true">
                    <Image
                      src={featured.image}
                      alt=""
                      width={1200}
                      height={800}
                      sizes="(max-width: 860px) 100vw, 560px"
                      priority
                    />
                  </Link>
                )}
                <div className={styles.featuredBody}>
                  <PostMetaLine date={featured.date} minutes={featured.readingMinutes} tag={featured.tags[0]} />
                  <h2 className={styles.featuredTitle}>
                    <Link href={`/blog/${featured.slug}`}>{featured.title}</Link>
                  </h2>
                  <p className={styles.cardDesc}>{featured.description}</p>
                  <Link href={`/blog/${featured.slug}`} className={styles.readMore}>
                    Read the guide <IconArrowRight width={16} height={16} />
                  </Link>
                </div>
              </Reveal>
            )}

            {rest.length > 0 && (
              <div className={styles.grid}>
                {rest.map((p, i) => (
                  <Reveal as="article" key={p.slug} className={`card ${styles.card}`} delay={(i % 3) * 70}>
                    {p.image && (
                      <Link href={`/blog/${p.slug}`} className={styles.cardMedia} tabIndex={-1} aria-hidden="true">
                        <Image src={p.image} alt="" width={600} height={400} sizes="(max-width: 700px) 100vw, 360px" />
                      </Link>
                    )}
                    <PostMetaLine date={p.date} minutes={p.readingMinutes} tag={p.tags[0]} />
                    <h2 className={styles.cardTitle}>
                      <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                    </h2>
                    <p className={styles.cardDesc}>{p.description}</p>
                  </Reveal>
                ))}
              </div>
            )}

            <div className={styles.ctaBox}>
              <h2 className={styles.ctaTitle}>Have a question that isn&apos;t covered here?</h2>
              <p>Talk it through with an advisor — free, and with no pressure to go ahead.</p>
              <a href={CONSULT_HREF} className="btn btn-primary">
                Book your free consultation <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function PostMetaLine({ date, minutes, tag }: { date: string; minutes: number; tag?: string }) {
  return (
    <p className={styles.meta}>
      {tag && <span className={styles.tag}>{tag}</span>}
      <time dateTime={date}>{formatDate(date)}</time>
      <span aria-hidden="true">·</span>
      <span>{minutes} min read</span>
    </p>
  );
}
