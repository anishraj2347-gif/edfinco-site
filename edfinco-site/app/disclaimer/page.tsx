import type { Metadata } from "next";
import { connection } from "next/server";
import LegalPageView from "@/components/LegalPageView";
import { DISCLAIMER } from "@/lib/content";

export const metadata: Metadata = {
  title: DISCLAIMER.seo.title,
  description: DISCLAIMER.seo.description,
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: DISCLAIMER.seo.title,
    description: DISCLAIMER.seo.description,
    url: DISCLAIMER.seo.canonical,
    type: "website",
  },
};

export default async function DisclaimerPage() {
  // Dynamic render so the strict-CSP per-request nonce (proxy.ts) is injected for the
  // client Header's hydration scripts. Matches /consultation.
  await connection();
  return <LegalPageView page={DISCLAIMER} />;
}
