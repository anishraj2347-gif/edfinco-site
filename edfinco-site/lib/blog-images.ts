// Header images the blog writer may use. All are the site's own licensed photos (see
// public/photos/CREDITS.md) — landscape crops that suit the post header. The website picks the
// image (not the AI), so a post can never reference an arbitrary file or an off-site image.
export interface BlogImage {
  src: string;
  alt: string;
}

export const BLOG_IMAGES: BlogImage[] = [
  { src: "/photos/collateral.jpg", alt: "A smiling mother, father and daughter standing together outdoors" },
  { src: "/photos/how.jpg", alt: "An application form on a clipboard beside a laptop" },
  {
    src: "/photos/consult-family.jpg",
    alt: "Two students working through a book and a laptop together in a library",
  },
  {
    src: "/photos/advisor-meeting.jpg",
    alt: "An advisor walking two young adults through the numbers with a calculator and documents",
  },
  {
    src: "/photos/platform.jpg",
    alt: "A young man researching and comparing options on his laptop while taking notes",
  },
  { src: "/photos/final-cta.jpg", alt: "Graduates in gowns throwing their caps in the air" },
];

/**
 * The current alt text for one of the site's own photos, or undefined for any other image.
 * Posts store the alt text they were written with, but a photo file can later be swapped for a
 * new picture under the same name (client change doc, 2026-11-17), so the stored text could
 * describe the old picture. Callers prefer this over the stored value.
 */
export function siteImageAlt(src: string | null | undefined): string | undefined {
  return src ? BLOG_IMAGES.find((img) => img.src === src)?.alt : undefined;
}

/** The image used least recently, so consecutive posts don't repeat a header. */
export function pickImage(recentSrcs: string[]): BlogImage {
  const unused = BLOG_IMAGES.filter((img) => !recentSrcs.includes(img.src));
  if (unused.length) return unused[0];
  // All used recently: take the one whose last use is oldest.
  const lastUse = (src: string) => recentSrcs.indexOf(src);
  return [...BLOG_IMAGES].sort((a, b) => lastUse(b.src) - lastUse(a.src))[0];
}
