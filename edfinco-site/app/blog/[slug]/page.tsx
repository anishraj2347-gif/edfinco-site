import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogMarkdown from "@/components/BlogMarkdown";
import { IconArrowRight, IconShield } from "@/components/Icons";
import { CONSULT_HREF, SITE } from "@/lib/content";
import { getAllPosts, getPost, formatDate } from "@/lib/blog";
import styles from "../blog.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found | EdFinco", robots: { index: false } };
  const title = `${post.title} | EdFinco`;
  return {
    title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      ...(post.image ? { images: [{ url: post.image, alt: post.imageAlt ?? "" }] } : {}),
    },
  };
}

function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function BlogPostPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
    ...(post.image ? { image: `${SITE.url}${post.image}` } : {}),
  };
  const related = (await getAllPosts()).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <div id="top" />
      <Header />
      <main id="main">
        <article>
          <header className={styles.postHero}>
            <div className={`container ${styles.postHeroInner}`}>
              <nav aria-label="Breadcrumb" className={styles.crumbs}>
                <Link href="/blog">Blog</Link>
                <span aria-hidden="true">/</span>
                <span>{post.tags[0] ?? "Guide"}</span>
              </nav>
              <h1 className={styles.postTitle}>{post.title}</h1>
              <p className={styles.postDesc}>{post.description}</p>
              <p className={styles.postMeta}>
                <span>{post.author}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readingMinutes} min read</span>
              </p>
            </div>
          </header>

          <div className={`container ${styles.postBody}`}>
            {post.image && (
              <div className={styles.postImage}>
                <Image
                  src={post.image}
                  alt={post.imageAlt ?? ""}
                  width={1200}
                  height={800}
                  sizes="(max-width: 820px) 100vw, 760px"
                  priority
                  quality={85}
                />
              </div>
            )}
            <BlogMarkdown blocks={post.blocks} />

            <aside className={styles.postNotice} aria-label="Important">
              <IconShield width={18} height={18} aria-hidden="true" />
              <p>
                This article is general information, not financial, legal, tax or immigration advice. EdFinco is a loan-assistance
                platform, not a lender — loan approval, amount, interest rate and terms are decided solely
                by the lender, and requirements vary by lender and profile.
              </p>
            </aside>

            <div className={styles.ctaBox}>
              <h2 className={styles.ctaTitle}>Want to talk this through for your situation?</h2>
              <p>Book a free consultation and we&apos;ll walk you through your options — no pressure to go ahead.</p>
              <a href={CONSULT_HREF} className="btn btn-primary">
                Book your free consultation <IconArrowRight width={18} height={18} />
              </a>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className={`section ${styles.related}`} aria-labelledby="related-title">
            <div className="container">
              <h2 id="related-title" className={styles.relatedTitle}>
                Keep reading
              </h2>
              <div className={styles.grid}>
                {related.map((p) => (
                  <article key={p.slug} className={`card ${styles.card}`}>
                    {p.image && (
                      <Link href={`/blog/${p.slug}`} className={styles.cardMedia} tabIndex={-1} aria-hidden="true">
                        <Image src={p.image} alt="" width={600} height={400} sizes="(max-width: 700px) 100vw, 360px" />
                      </Link>
                    )}
                    <p className={styles.meta}>
                      <time dateTime={p.date}>{formatDate(p.date)}</time>
                    </p>
                    <h3 className={styles.cardTitle}>
                      <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                    </h3>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: serialize(articleLd) }}
      />
    </>
  );
}
