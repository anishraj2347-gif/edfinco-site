// Emits FAQPage + Organization JSON-LD. The inline <script> carries the per-request CSP nonce
// (read from the x-nonce header set in proxy.ts) so it is allowed under the strict script-src.
// The payload is a controlled, compliance-approved object (never user input); we still escape "<"
// to prevent any accidental markup break-out. Reading headers() makes the page dynamic, which the
// nonce-based CSP requires anyway.
import { headers } from "next/headers";
import { SITE, SEO, HOME } from "@/lib/content";

function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function JsonLd() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    email: SITE.email,
    slogan: SITE.tagline,
    description: SEO.description,
    sameAs: [SITE.instagramUrl],
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: serialize(faqLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: serialize(orgLd) }}
      />
    </>
  );
}
