// Header images the blog writer may use. All are the site's own licensed photos (see
// public/photos/CREDITS.md) — landscape crops that suit the post header. The website picks the
// image (not the AI), so a post can never reference an arbitrary file or an off-site image.
export interface BlogImage {
  src: string;
  alt: string;
}

export const BLOG_IMAGES: BlogImage[] = [
  { src: "/photos/collateral.jpg", alt: "A couple reviewing financial documents together at home" },
  { src: "/photos/how.jpg", alt: "Filling in an application form at a desk beside a laptop" },
  {
    src: "/photos/consult-family.jpg",
    alt: "A couple smiling while planning together at home with a laptop and notebook",
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

/** The image used least recently, so consecutive posts don't repeat a header. */
export function pickImage(recentSrcs: string[]): BlogImage {
  const unused = BLOG_IMAGES.filter((img) => !recentSrcs.includes(img.src));
  if (unused.length) return unused[0];
  // All used recently: take the one whose last use is oldest.
  const lastUse = (src: string) => recentSrcs.indexOf(src);
  return [...BLOG_IMAGES].sort((a, b) => lastUse(b.src) - lastUse(a.src))[0];
}
