// The sample inputs the `v0_5_0-markup.json` fixture was rendered from with the
// v0.5.0 components. `design-knobs.test.ts` renders the SAME inputs with the
// current components (theme passed everywhere, every v0.6.0 key absent) and
// asserts byte-identical markup. One deliberate refresh since: v0.6.1 made the
// `bar` header row wrap on phones, so the `full:themeCss` entry (a bar theme)
// carries the three updated bar rules; every other entry is the v0.5.0 output.

export const SAMPLE_THEMES: Record<string, Record<string, unknown>> = {
  plain: { brand_name: "Example Blog", layout_variant: "journal" },
  full: {
    brand_name: "Example Co",
    tagline: "Notes on building Example Co",
    accent_color: "#7a1f1f",
    palette: { kind: "preset", preset_id: "oxblood_cream", primary: "#7a1f1f", secondary: "#f3e9d2" },
    font_pair: "editorial",
    layout_variant: "grid",
    header_variant: "bar",
    post_variant: "wide",
    radius: "10px",
    space: "20px",
    class_prefix: "exr",
    logo_key: "images/logo.png",
    logo_width: 160,
    contact_email: "hello@example.com",
    surface: { bg: "#0f172a", ink: "#e2e8f0", muted: "#94a3b8", line: "#1e293b" },
    nav_links: [
      { label: "Guides", href: "/guides" },
      { label: "Start", href: "https://example.com/start", style: "pill" },
    ],
    hero: {
      title: "Practical guides from Example Co",
      subtitle: "Short, tested how-tos.",
      image_key: "images/hero.webp",
      cta: { label: "Start here", href: "/posts/getting-started" },
    },
    font_files: [{ family: "Example Sans", src: "fonts/example-sans.woff2", weight: "100 900" }],
  },
};

export const SAMPLE_SITE = {
  site_name: "Example Blog",
  canonical_hostname: "blog.example.com",
  language: "en",
  authors: [{ slug: "jane-doe", name: "Jane Doe", title: "Editor", bio: "Writes guides.", expertise: ["Guides"] }],
};

const fm = (over: Record<string, unknown>) => ({
  title: "A post",
  description: "A short description.",
  status: "published",
  publishAt: "2026-11-01T09:00:00Z",
  updatedAt: null,
  lang: null,
  author: "Jane Doe",
  authorSlug: "jane-doe",
  schemaVariant: null,
  translationOf: null,
  faqSchema: null,
  faq: [],
  coverImage: null,
  coverImageAlt: null,
  bodyFormat: null,
  paidBrands: [],
  otherBrands: [],
  ...over,
});

export const SAMPLE_MARKDOWN = [
  "# Getting started",
  "",
  "A paragraph with **bold**, *italic* and a [link](/posts/next).",
  "Second line of the same paragraph.",
  "",
  "## Steps",
  "",
  "- First step with [a link](https://example.com/a)",
  "- Second **important** step",
  "",
  "### Notes",
  "",
  '![A diagram](/images/diagram.png "How it fits together")',
  "",
  "Closing words.",
].join("\n");

export const SAMPLE_POSTS = [
  {
    slug: "getting-started",
    frontmatter: fm({ title: "Getting started", bodyFormat: "markdown" }),
    html: SAMPLE_MARKDOWN,
  },
  {
    slug: "html-post",
    frontmatter: fm({
      title: "An HTML post",
      description: null,
      publishAt: "2026-10-20T23:30:00Z",
      authorSlug: "someone-else",
      author: "Guest Writer",
      coverImage: "/images/cover.png",
      coverImageAlt: "Cover",
      faq: [{ question: "Is it simple?", answer: "Yes." }],
    }),
    html: "<article><p>First paragraph.</p><ul><li>One</li></ul></article>",
  },
  {
    slug: "hola",
    frontmatter: fm({ title: "Hola", lang: "es", translationOf: "getting-started" }),
    html: "Un párrafo.",
  },
];
