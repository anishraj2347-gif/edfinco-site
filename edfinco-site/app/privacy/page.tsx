import type { Metadata } from "next";
import { connection } from "next/server";
import LegalPageView from "@/components/LegalPageView";
import { PRIVACY } from "@/lib/content";

export const metadata: Metadata = {
  title: PRIVACY.seo.title,
  description: PRIVACY.seo.description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: PRIVACY.seo.title,
    description: PRIVACY.seo.description,
    url: PRIVACY.seo.canonical,
    type: "website",
  },
};

export default async function PrivacyPage() {
  // Dynamic render so the strict-CSP per-request nonce (proxy.ts) is injected for the
  // client Header's hydration scripts. Matches /consultation.
  await connection();
  return <LegalPageView page={PRIVACY} />;
}
