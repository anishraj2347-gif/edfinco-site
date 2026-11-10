import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { SEO, SITE } from "@/lib/content";

// Self-hosted via next/font (no external network request at runtime, no layout shift).
const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SEO.title,
    template: `%s · ${SITE.name}`,
  },
  description: SEO.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  keywords: [
    "education loan for abroad studies",
    "study abroad loan",
    "education loan without collateral",
    "education loan co-borrower",
    "student loan for Indian students",
    "compare education loan options",
  ],
  authors: [{ name: SITE.name }],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SEO.ogTitle,
    description: SEO.ogDescription,
    url: SITE.url,
    locale: "en_IN",
    // Same-origin social card (resolved against metadataBase). No claims in the alt text.
    images: [
      {
        url: "/photos/og.jpg",
        width: 1200,
        height: 630,
        alt: "EdFinco — education-loan guidance for Indian students studying abroad",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.ogTitle,
    description: SEO.ogDescription,
    images: [
      {
        url: "/photos/og.jpg",
        width: 1200,
        height: 630,
        alt: "EdFinco — education-loan guidance for Indian students studying abroad",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "finance",
};

export const viewport: Viewport = {
  // Forest brand chrome on mobile browsers (matches the hero/footer --forest).
  themeColor: "#0C2B1E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={lexend.variable}>
      <head>
        {/* Belt-and-braces: if JS is disabled, never let scroll-reveal keep content hidden.
            (With JS, Reveal adds `.reveal-ready` to <html>; CSS gates the hide rule on it.) */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
