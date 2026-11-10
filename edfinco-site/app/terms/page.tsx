import type { Metadata } from "next";
import { connection } from "next/server";
import LegalPageView from "@/components/LegalPageView";
import { TERMS } from "@/lib/content";

export const metadata: Metadata = {
  title: TERMS.seo.title,
  description: TERMS.seo.description,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: TERMS.seo.title,
    description: TERMS.seo.description,
    url: TERMS.seo.canonical,
    type: "website",
  },
};

export default async function TermsPage() {
  // Dynamic render so the strict-CSP per-request nonce (proxy.ts) is injected for the
  // client Header's hydration scripts. Matches /consultation.
  await connection();
  return <LegalPageView page={TERMS} />;
}
