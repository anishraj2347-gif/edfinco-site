import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONSULT_HREF } from "@/lib/content";

// Branded 404 for any unknown URL (and unpublished/removed blog posts).
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="section">
        <div className="container" style={{ maxWidth: 680, textAlign: "center", paddingBlock: "48px" }}>
          <p style={{ fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--emerald)", fontSize: "0.85rem" }}>
            Page not found
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", lineHeight: 1.2, color: "var(--forest)", margin: "8px 0 16px" }}>
            We couldn&apos;t find that page.
          </h1>
          <p style={{ color: "var(--muted)", marginBottom: 28 }}>
            It may have moved, or the link may be wrong. Here are some good places to start.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" className="btn btn-primary">
              Go to the home page
            </Link>
            <Link href="/blog" className="btn btn-ghost">
              Read the blog
            </Link>
            <a href={CONSULT_HREF} className="btn btn-ghost">
              Book a free consultation
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
