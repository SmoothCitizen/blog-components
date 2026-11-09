// The sample themes the `v0_6_1-markup.json` fixture was rendered from with the
// v0.6.1 components. They exercise every v0.6.0 design knob (cards, built-in
// and image motifs, typography, labels, logo mark, date format, header align),
// so `fidelity.test.ts` can render the SAME inputs with the current components
// (every v0.7.0 key absent, or at its explicit default) and assert
// byte-identical stylesheet + markup. Posts/site come from the v0.5.0 sample.

export const SAMPLE_THEMES_061: Record<string, Record<string, unknown>> = {
  plain: { brand_name: "Example Blog", layout_variant: "journal" },
  cards: {
    brand_name: "Example Notes",
    tagline: "Field notes",
    palette: { primary: "#2f6f4e", secondary: "#f3e9d2" },
    font_pair: "modern",
    layout_variant: "journal",
    header_variant: "bar",
    header_align: "content",
    surface: { bg: "#faf8f4", ink: "#1f1f1f", muted: "#5a5a5a", line: "#e6e1d8" },
    nav_links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
    ],
    hero: { eyebrow: "Notes · Guides", title: "Example Notes", subtitle: "Short, tested how-tos." },
    post_list_variant: "cards",
    post_list_cta_label: "Read the guide →",
    pattern: "dots",
    heading_weight: 700,
    nav_case: "uppercase",
    letter_spacing: "0.06em",
    meta_style: "mono",
    index_label: "Latest",
    footer_tagline: "Short notes, written carefully.",
    logo_mark_key: "images/mark.svg",
    date_format: "long",
  },
  image: {
    brand_name: "Example Night",
    class_prefix: "exn",
    palette: { primary: "#f0a020", secondary: null },
    layout_variant: "minimal",
    header_variant: "centered",
    post_variant: "narrow",
    surface: { bg: "#161210", ink: "#f2ece4", muted: "#b8ada0", line: "#2c2622" },
    hero: { title: "After dark", subtitle: "Dispatches.", align: "center" },
    pattern_image_key: "images/motif.svg",
    heading_case: "uppercase",
    logo_case: "uppercase",
    letter_spacing: "0.02em",
    drop_cap: true,
    list_marker: "dash",
    heading_accent: true,
    mono_font: '"Example Mono", monospace',
  },
  grid: {
    brand_name: "Example Grid",
    accent_color: "#1d4ed8",
    layout_variant: "grid",
    header_variant: "compact",
    post_list_variant: "list",
    pattern: "herringbone",
    list_marker: "accent",
    date_format: "iso",
  },
};
