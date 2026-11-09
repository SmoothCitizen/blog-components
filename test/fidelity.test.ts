// v0.7.0 fidelity keys. Logic only: parsing/validation of every new key, the
// CSS each one emits (and that nothing can inject CSS), the contrast maths
// behind motif strength / scrim / wash / inverse hero / eyebrow colours, the
// date short format, the markup decisions (card meta, numbered list, post
// header, footer variants) and the byte-compat rule — every key absent or at
// its explicit default renders the captured v0.6.1 stylesheet + markup.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AuthorProfile, PostArticle, PostIndex, PostList } from "../src/components/posts";
import { SiteFooter, SiteHeader } from "../src/components/chrome";
import type { Post } from "../src/content/types";
import { parseSiteConfig } from "../src/site/schema";
import { AA_CONTRAST, contrastRatio, mix } from "../src/theme/palette";
import { resolveSurface, themeCss } from "../src/theme/css";
import {
  guardAgainst,
  inverseSurface,
  postHeaderMode,
  scrimAlpha,
  usesLegacyMotif,
  washColors,
} from "../src/theme/fidelity";
import { parseHeroWash, parseTheme } from "../src/theme/schema";
import { formatDisplayDate } from "../src/util";
import { SAMPLE_POSTS, SAMPLE_SITE, SAMPLE_THEMES } from "./fixtures/v0_5_0-sample";
import { SAMPLE_THEMES_061 } from "./fixtures/v0_6_1-sample";

const FIXTURE_061: Record<string, string> = JSON.parse(
  readFileSync(new URL("./fixtures/v0_6_1-markup.json", import.meta.url), "utf8"),
);
const FIXTURE_050: Record<string, string> = JSON.parse(
  readFileSync(new URL("./fixtures/v0_5_0-markup.json", import.meta.url), "utf8"),
);
const html = (el: unknown) => renderToStaticMarkup(el as never);
const BASE = { brand_name: "Example Blog", layout_variant: "journal" };
const site = parseSiteConfig(SAMPLE_SITE);
const posts = SAMPLE_POSTS as unknown as Post[];
const css = (over: Record<string, unknown>) => themeCss(parseTheme({ ...BASE, ...over }));
const DARK = { bg: "#161210", ink: "#f2ece4", muted: "#b8ada0", line: "#2c2622" };

// Every v0.7.0 enum/boolean key at its explicit default value.
const DEFAULTS_062 = {
  pattern_strength: "subtle",
  pattern_position: "cover",
  hero_style: "panel",
  card_meta: "date_reading",
  card_meta_position: "top",
  card_style: "raised",
  card_cta_position: "bottom",
  card_feature_first: false,
  byline_order: "date_author",
  meta_separator: "dot",
  meta_case: "none",
  author_style: "accent",
  post_title_color: "accent",
  eyebrow_color: "muted",
  index_label_style: "rule",
  footer_variant: "plain",
  footer_align: "left",
  nav_font: "body",
  nav_size: "md",
  nav_style: "plain",
  brand_size: "md",
  tagline_position: "inline",
  post_header_align: "left",
  post_meta_layout: "classic",
  description_style: "normal",
  divider: "accent",
  heading_case_scope: "all",
};

function renderAll(raw: Record<string, unknown>): Record<string, string> {
  const theme = parseTheme(raw);
  const p = theme.class_prefix;
  const out: Record<string, string> = {
    themeCss: themeCss(theme),
    header: html(createElement(SiteHeader, { theme, classPrefix: p })),
    footer: html(createElement(SiteFooter, { theme, year: 2026, classPrefix: p })),
    list: html(createElement(PostList, { posts, site, theme, classPrefix: p })),
    author: html(createElement(AuthorProfile, { author: site.authors[0]!, posts, site, theme, classPrefix: p })),
  };
  for (const page of [1, 2]) {
    out[`index${page}`] = html(createElement(PostIndex, { posts, site, theme, page, totalPages: 2, classPrefix: p }));
  }
  for (const post of posts) out[`article:${post.slug}`] = html(createElement(PostArticle, { post, site, theme, classPrefix: p }));
  return out;
}

describe("v0.6.1 byte-compatibility", () => {
  for (const [name, raw] of Object.entries(SAMPLE_THEMES_061)) {
    for (const [label, config] of [
      ["keys absent", raw],
      ["keys at explicit defaults", { ...raw, ...DEFAULTS_062 }],
    ] as const) {
      it(`${name} theme, ${label}: themeCss + every component's markup are unchanged`, () => {
        for (const [key, value] of Object.entries(renderAll(config))) {
          expect(value, `${name}:${key}`).toBe(FIXTURE_061[`${name}:${key}`]);
        }
      });
    }
  }

  it("the v0.5.0 fixture still holds with every v0.7.0 key at its default", () => {
    for (const [name, raw] of Object.entries(SAMPLE_THEMES)) {
      for (const [key, value] of Object.entries(renderAll({ ...raw, ...DEFAULTS_062 }))) {
        expect(value, `${name}:${key}`).toBe(FIXTURE_050[`${name}:${key}`]);
      }
    }
  });

  it("a post-header motif equal to the hero motif keeps the v0.6.1 output", () => {
    const cards = SAMPLE_THEMES_061.cards!;
    expect(renderAll({ ...cards, post_header_pattern: "dots" })).toEqual(renderAll(cards));
    expect(usesLegacyMotif(parseTheme({ ...cards, post_header_pattern: "dots" }))).toBe(true);
    expect(usesLegacyMotif(parseTheme({ ...cards, post_header_pattern: "grid" }))).toBe(false);
  });

  it("keys that only modify another key do nothing alone", () => {
    expect(css({ accent_color_2: "#336699" })).toBe(css({}));
    expect(css({ date_order: "dmy" })).toBe(css({}));
    expect(css({ heading_case_scope: "display" })).toBe(css({}));
    expect(css({ card_feature_label: "Latest" })).toBe(css({}));
    expect(css({ footer_links_label: "More" })).toBe(css({}));
  });
});

describe("parsing: defaults + per-key validation (never throws)", () => {
  it("defaults every key when absent", () => {
    expect(parseTheme(BASE)).toMatchObject({
      ...DEFAULTS_062,
      post_header_pattern: null,
      post_header_pattern_image_key: null,
      hero_wash: null,
      post_list_columns: null,
      card_feature_label: null,
      excerpt_lines: null,
      byline_prefix: null,
      accent_color_2: null,
      label_tracking: null,
      label_font: null,
      date_order: null,
      footer_surface: null,
      footer_links_label: null,
      header_surface: null,
      content_width: null,
      post_header_eyebrow: null,
    });
  });

  it("accepts every allowed value", () => {
    const t = parseTheme({
      ...BASE,
      pattern_strength: "bold",
      pattern_position: "top-right",
      post_header_pattern: "grid",
      post_header_pattern_image_key: "/images/band.png",
      hero_wash: { from: "#e8f0ea", to: "#f6e3dc", angle: 90 },
      hero_style: "inverse",
      post_list_variant: "numbered",
      post_list_columns: 2,
      card_meta: "author_date",
      card_meta_position: "bottom",
      card_style: "flat",
      card_cta_position: "inline",
      card_feature_first: true,
      card_feature_label: "Latest",
      excerpt_lines: "3",
      byline_prefix: "By",
      byline_order: "author_date",
      meta_separator: "slash",
      meta_case: "uppercase",
      author_style: "underline",
      post_title_color: "ink",
      eyebrow_color: "accent2",
      accent_color_2: "#c05621",
      label_tracking: "0.14em",
      label_font: "heading",
      index_label_style: "bar",
      date_format: "short",
      date_order: "dmy",
      footer_variant: "columns",
      footer_surface: "sunken",
      footer_align: "center",
      footer_links_label: "Editorial",
      nav_font: "mono",
      nav_size: "sm",
      nav_style: "ruled",
      brand_size: "lg",
      header_surface: "bg",
      tagline_position: "above",
      content_width: 700,
      post_header_align: "center",
      post_header_eyebrow: "Field notes",
      post_meta_layout: "split",
      description_style: "italic",
      divider: "cross",
      heading_case_scope: "display",
      hero: { title: "A slower way", title_accent: "to read." },
    });
    expect(t).toMatchObject({
      pattern_strength: "bold",
      pattern_position: "top-right",
      post_header_pattern: "grid",
      post_header_pattern_image_key: "images/band.png",
      hero_wash: { from: "#e8f0ea", to: "#f6e3dc", angle: 90 },
      hero_style: "inverse",
      post_list_variant: "numbered",
      post_list_columns: 2,
      card_meta: "author_date",
      card_meta_position: "bottom",
      card_style: "flat",
      card_cta_position: "inline",
      card_feature_first: true,
      card_feature_label: "Latest",
      excerpt_lines: 3,
      byline_prefix: "By",
      byline_order: "author_date",
      meta_separator: "slash",
      meta_case: "uppercase",
      author_style: "underline",
      post_title_color: "ink",
      eyebrow_color: "accent2",
      accent_color_2: "#c05621",
      label_tracking: "0.14em",
      label_font: "heading",
      index_label_style: "bar",
      date_format: "short",
      date_order: "dmy",
      footer_variant: "columns",
      footer_surface: "sunken",
      footer_align: "center",
      footer_links_label: "Editorial",
      nav_font: "mono",
      nav_size: "sm",
      nav_style: "ruled",
      brand_size: "lg",
      header_surface: "bg",
      tagline_position: "above",
      content_width: 700,
      post_header_align: "center",
      post_header_eyebrow: "Field notes",
      post_meta_layout: "split",
      description_style: "italic",
      divider: "cross",
      heading_case_scope: "display",
    });
    expect(t.hero?.title_accent).toBe("to read.");
    expect(parseTheme({ ...BASE, post_header_pattern: "none" }).post_header_pattern).toBe("none");
  });

  it("drops each invalid value on its own, falling back to the default", () => {
    const t = parseTheme({
      ...BASE,
      pattern_strength: "loud",
      pattern_position: "bottom",
      post_header_pattern: "plaid",
      post_header_pattern_image_key: "../band.png",
      hero_wash: { from: "red", to: "#ffffff" },
      hero_style: "glass",
      post_list_columns: 3,
      card_meta: "author",
      card_meta_position: "middle",
      card_style: "shadow",
      card_cta_position: "top",
      card_feature_first: "yes",
      card_feature_label: "x".repeat(25),
      excerpt_lines: 9,
      byline_prefix: "Written by the",
      byline_order: "random",
      meta_separator: ";}",
      meta_case: "lowercase",
      author_style: "bold",
      post_title_color: "red",
      eyebrow_color: "#ff0000",
      accent_color_2: "rgb(1,2,3)",
      label_tracking: "1vw",
      label_font: "cursive",
      index_label_style: "box",
      date_order: "ymd",
      footer_variant: "mega",
      footer_surface: "ink",
      footer_align: "right",
      footer_links_label: "x".repeat(25),
      nav_font: "serif",
      nav_size: "lg",
      nav_style: "boxed",
      brand_size: "xl",
      header_surface: "image",
      tagline_position: "below",
      content_width: 2000,
      post_header_align: "right",
      post_header_eyebrow: "x".repeat(41),
      post_meta_layout: "stacked",
      description_style: "bold",
      divider: "wave",
      heading_case_scope: "h1",
      hero: { title: "Welcome", title_accent: "x".repeat(81) },
    });
    expect(t).toMatchObject({ ...parseTheme(BASE), hero: { title: "Welcome", title_accent: null } });
  });

  it("content_width / excerpt_lines are bounded integers", () => {
    for (const [v, want] of [
      [560, 560],
      [1100, 1100],
      ["720", 720],
      [559, null],
      [1101, null],
      [700.5, null],
      ["700px", null],
    ] as const) {
      expect(parseTheme({ ...BASE, content_width: v }).content_width, String(v)).toBe(want);
    }
    expect(parseTheme({ ...BASE, excerpt_lines: 1 }).excerpt_lines).toBeNull();
    expect(parseTheme({ ...BASE, excerpt_lines: 6 }).excerpt_lines).toBe(6);
  });

  it("hero_wash: both hexes required, angle defaults on its own", () => {
    expect(parseHeroWash({ from: "#abc", to: "#ffffff" })).toEqual({ from: "#abc", to: "#ffffff", angle: 135 });
    expect(parseHeroWash({ from: "#abc", to: "#ffffff", angle: 400 })?.angle).toBe(135);
    expect(parseHeroWash({ from: "#abc" })).toBeNull();
    expect(parseHeroWash({ from: "#abc", to: "#fff;}" })).toBeNull();
    expect(parseHeroWash(["#abc", "#fff"])).toBeNull();
  });
});

describe("CSS output", () => {
  it("emits each key's rules only when set", () => {
    expect(css({ content_width: 700 })).toContain(".wrap{max-width:700px}");
    expect(css({ content_width: 700, header_align: "content" })).toContain("[data-header] .site-header .wrap{max-width:700px}");
    expect(css({ brand_size: "sm" })).toContain("[data-header] .site-header .brand .name{font-size:20px}");
    expect(css({ header_surface: "bg" })).toContain("[data-header] .site-header{background:var(--bg);border-bottom-color:var(--line)}");
    expect(css({ tagline_position: "above" })).toContain(".site-header .tagline{order:-1;");
    expect(css({ nav_font: "mono" })).toMatch(/\.site-nav\{font-family:ui-monospace/);
    expect(css({ nav_size: "sm" })).toContain("[data-header] .site-nav{font-size:13px}");
    expect(css({ nav_style: "ruled" })).toContain('[data-header="centered"] .site-nav::before');
    expect(css({ label_tracking: "0.2em" })).toContain(".index-label,.post-header-eyebrow,.post-card-feature-label,.footer-links-label{letter-spacing:0.2em}");
    expect(css({ label_font: "heading" })).toContain("{font-family:var(--font-heading)}");
    expect(css({ index_label_style: "bar" })).toContain(".index-label::after{display:none}");
    expect(css({ post_title_color: "ink" })).toContain("[data-layout] .post-list h2 a{color:var(--ink)}");
    expect(css({ post_list_columns: 1 })).toContain("grid-template-columns:minmax(0,1fr)}");
    expect(css({ post_list_columns: 2 })).toContain("@media (max-width:640px)");
    expect(css({ card_style: "flat" })).toContain("{box-shadow:none;transition:none}");
    expect(css({ card_feature_first: true })).toContain(".post-card.post-card-feature{grid-column:1/-1}");
    expect(css({ excerpt_lines: 3 })).toContain("-webkit-line-clamp:3;");
    expect(css({ post_list_variant: "numbered" })).toContain("[data-layout] .post-list.post-numbered{display:block;");
    expect(css({ meta_case: "uppercase" })).toContain(".post-list .post-meta,.post .post-meta{text-transform:uppercase;letter-spacing:.06em");
    expect(css({ meta_case: "uppercase", label_tracking: "1px" })).toContain("{text-transform:uppercase;letter-spacing:1px;");
    expect(css({ author_style: "underline" })).toContain("text-decoration-color:var(--accent)");
    expect(css({ post_header_eyebrow: "Notes" })).toContain(".post-header-eyebrow{margin:0 0 10px;color:var(--eyebrow,var(--muted))");
    expect(css({ post_header_align: "center" })).toContain(".post-header-center{text-align:center}");
    expect(css({ description_style: "italic" })).toContain(".post-description{font-style:italic}");
    expect(css({ divider: "none" })).toContain(".accent-rule{display:none}");
    expect(css({ divider: "ticks" })).toContain("repeating-linear-gradient(90deg,var(--accent-line)");
    expect(css({ heading_case: "uppercase", heading_case_scope: "display" })).toContain("h2,h3,h4{text-transform:none;letter-spacing:normal}");
    expect(css({ hero: { title: "A", title_accent: "b" } })).toContain(".index-hero h1 .index-hero-title-accent{color:var(--accent);font-style:italic");
    expect(css({ footer_surface: "panel" })).toContain(".site-footer{background:var(--panel);border-top-color:var(--line)}");
    expect(css({ footer_variant: "band" })).toContain(".site-footer.site-footer-band{border-top:3px solid var(--accent);padding:36px 0 44px;background:var(--panel)}");
    expect(css({ footer_variant: "band", footer_surface: "bg" })).toContain(".site-footer.site-footer-band{border-top:3px solid var(--accent);padding:36px 0 44px}");
    expect(css({ footer_variant: "columns" })).toContain(".site-footer-columns .footer-columns{display:grid;");
    expect(css({ footer_align: "center" })).toContain(".site-footer .wrap{text-align:center}");
  });

  it("class_prefix namespaces every new selector", () => {
    const out = css({
      class_prefix: "exb",
      post_list_variant: "numbered",
      footer_variant: "columns",
      index_label_style: "bar",
      post_header_eyebrow: "N",
      pattern: "dots",
      pattern_strength: "bold",
    });
    expect(out).toContain(".exb-post-list.exb-post-numbered");
    expect(out).toContain(".exb-site-footer-columns .exb-footer-columns");
    expect(out).toContain(".exb-post-header .exb-post-header-text{");
    expect(out).not.toMatch(/[^-]\.(post-numbered|footer-columns|post-header-text|post-header-eyebrow)\b/);
  });

  it("no value reaches the stylesheet unvalidated", () => {
    const evil = "x;}</style><script>alert(1)</script>";
    const out = themeCss({
      ...parseTheme(BASE),
      // a hand-built theme object bypassing parseTheme
      content_width: evil as never,
      label_tracking: evil,
      accent_color_2: evil,
      eyebrow_color: "accent2",
      hero_wash: { from: evil, to: evil, angle: evil as never },
      post_header_pattern_image_key: `${evil}.svg`,
      pattern_strength: evil as never,
      pattern_position: evil as never,
      divider: evil as never,
      footer_surface: evil as never,
      header_surface: evil as never,
      excerpt_lines: evil as never,
      post_list_columns: evil as never,
      brand_size: evil as never,
      mono_font: evil,
      nav_font: "mono",
    });
    expect(out).not.toContain("</style>");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("--pattern-image-post");
  });
});

describe("motif strength, placement and per-target motifs", () => {
  const builtIns = ["dots", "grid", "pinstripe", "herringbone"] as const;

  it("subtle + a position draws a masked layer with the guarded ink (no scrim)", () => {
    const out = css({ pattern: "dots", pattern_position: "top-right" });
    expect(out).toContain(".index-hero::before{content:\"\";position:absolute;inset:0;z-index:-1;");
    expect(out).toContain("mask-image:radial-gradient(120% 130% at 100% 0");
    expect(out).not.toContain(".index-hero-text{");
  });

  it("medium/bold motifs are stronger than subtle and put a text-safe scrim behind the text", () => {
    const ink = (o: string) => /\.index-hero::before\{[^}]*--pattern-ink:(#[0-9a-f]{6})/.exec(o)?.[1];
    const s = resolveSurface(null);
    for (const p of builtIns) {
      const subtle = ink(css({ pattern: p, pattern_position: "center" }));
      const bold = ink(css({ pattern: p, pattern_strength: "bold" }));
      expect(bold, p).toBeDefined();
      if (subtle) expect(contrastRatio(bold!, s.panel), p).toBeGreaterThan(contrastRatio(subtle, s.panel));
      expect(css({ pattern: p, pattern_strength: "medium" }), p).toMatch(/\.index-hero \.index-hero-text\{position:relative;background-color:rgba\(/);
    }
  });

  it("the scrim alpha keeps ink + muted readable over every motif pixel", () => {
    for (const surface of [null, DARK]) {
      const s = resolveSurface(surface);
      for (const pixels of [["#000000", "#ffffff"], [mix("#7a1f1f", s.bg, 0.9), s.bg]]) {
        const a = scrimAlpha(s.bg, pixels, [s.ink, s.muted]);
        expect(a).toBeGreaterThanOrEqual(0.5);
        for (const px of pixels) {
          const seen = mix(s.bg, px, a);
          expect(contrastRatio(s.ink, seen)).toBeGreaterThanOrEqual(AA_CONTRAST);
          expect(contrastRatio(s.muted, seen)).toBeGreaterThanOrEqual(Math.min(AA_CONTRAST, contrastRatio(s.muted, s.bg)));
        }
      }
    }
  });

  it("a subtle custom image in the new path is as safe as the v0.6.0 veil", () => {
    const out = css({ pattern_image_key: "images/m.svg", pattern_position: "top" });
    const opacity = Number(/background-image:var\(--pattern-image\)[^}]*opacity:([0-9.]+)/.exec(out)?.[1]);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThanOrEqual(0.18);
    expect(out.endsWith(':root{--pattern-image:url("/images/m.svg")}')).toBe(true);
  });

  it("the post header can carry its own motif (or none)", () => {
    const own = css({ pattern: "dots", post_header_pattern: "grid" });
    expect(own).toMatch(/\.index-hero::before\{[^}]*radial-gradient\(var\(--pattern-ink\)/);
    expect(own).toMatch(/\.post-header::before\{[^}]*linear-gradient\(var\(--pattern-ink\) 1px/);
    const img = css({ pattern: "dots", post_header_pattern_image_key: "images/band.png" });
    expect(img).toContain(".post-header::before{");
    expect(img).toContain("background-image:var(--pattern-image-post)");
    expect(img.endsWith(':root{--pattern-image-post:url("/images/band.png")}')).toBe(true);
    const none = css({ pattern: "dots", post_header_pattern: "none" });
    expect(none).not.toContain(".post-header::before");
    expect(postHeaderMode(parseTheme({ ...BASE, pattern: "dots", post_header_pattern: "none" })).wrap).toBe(false);
  });

  it("the hero wash is mixed in only as far as the text keeps its contrast", () => {
    for (const surface of [null, DARK]) {
      const s = resolveSurface(surface);
      const texts = [s.ink, s.muted];
      for (const [from, to] of [
        ["#2f6f4e", "#c0504d"],
        ["#000000", "#ffffff"],
      ]) {
        const w = washColors(from!, to!, s.panel, texts);
        if (!w) continue;
        for (const c of [w.from, w.to, w.mid]) {
          for (const text of texts) {
            expect(contrastRatio(text, c)).toBeGreaterThanOrEqual(Math.min(AA_CONTRAST, contrastRatio(text, s.panel)));
          }
        }
      }
    }
    expect(css({ hero_wash: { from: "#e8f0ea", to: "#f6e3dc" } })).toMatch(/\.index-hero\{background-image:linear-gradient\(135deg,#[0-9a-f]{6},#[0-9a-f]{6}\)\}/);
  });

  it("inverse hero style flips the tokens and keeps every text colour at AA", () => {
    for (const surface of [null, DARK]) {
      const s = resolveSurface(surface);
      const inv = inverseSurface(s);
      expect(contrastRatio(inv.ink, inv.bg)).toBeGreaterThanOrEqual(AA_CONTRAST);
      expect(contrastRatio(inv.muted, inv.bg)).toBeGreaterThanOrEqual(AA_CONTRAST);
    }
    const out = css({ hero_style: "inverse", eyebrow_color: "accent", palette: { primary: "#c05621" } });
    const block = /\.index-hero,\.post-header\{(--ink:[^}]*)\}/.exec(out)?.[1] ?? "";
    const token = (n: string) => new RegExp(`--${n}:(#[0-9a-f]{6})`).exec(block)?.[1]!;
    expect(contrastRatio(token("accent"), token("bg"))).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(contrastRatio(token("eyebrow"), token("bg"))).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(postHeaderMode(parseTheme({ ...BASE, hero_style: "inverse" }))).toMatchObject({ wrap: true, decorated: true });
  });

  it("flat hero style drops the panel; without a motif it also drops the side padding", () => {
    expect(css({ hero_style: "flat" })).toContain(".index-hero{background:none;border:0;border-bottom:1px solid var(--line);border-radius:0}");
    expect(css({ hero_style: "flat" })).toContain(".index-hero{padding-left:0;padding-right:0}");
    expect(css({ hero_style: "flat", pattern: "dots" })).not.toContain("padding-left:0");
  });
});

describe("colour guards", () => {
  it("guardAgainst returns a colour at AA on every base, or null", () => {
    const light = ["#ffffff", "#f6f7f9", "#e9eaeb"];
    for (const hex of ["#f0a020", "#c05621", "#7a1f1f", "#ffffff"]) {
      const g = guardAgainst(hex, light);
      expect(g).not.toBeNull();
      for (const b of light) expect(contrastRatio(g!, b)).toBeGreaterThanOrEqual(AA_CONTRAST);
    }
    expect(guardAgainst("nope", light)).toBeNull();
  });

  it("eyebrow_color accent2 uses the guarded second accent", () => {
    const out = css({ eyebrow_color: "accent2", accent_color_2: "#ffd27a" });
    const eyebrow = /:root\{--eyebrow:(#[0-9a-f]{6})\}/.exec(out)?.[1];
    expect(eyebrow).toBeDefined();
    expect(contrastRatio(eyebrow!, "#ffffff")).toBeGreaterThanOrEqual(AA_CONTRAST);
  });

  it("the sunken footer moves away from the ink (more contrast, never less)", () => {
    for (const surface of [null, DARK]) {
      const s = resolveSurface(surface);
      const out = css({ surface, footer_surface: "sunken" });
      const bg = /\.site-footer\{background:(#[0-9a-f]{6})/.exec(out)?.[1]!;
      expect(contrastRatio(s.ink, bg)).toBeGreaterThanOrEqual(contrastRatio(s.ink, s.bg));
      expect(contrastRatio(s.muted, bg)).toBeGreaterThanOrEqual(contrastRatio(s.muted, s.bg));
    }
  });
});

describe("formatDisplayDate short", () => {
  it("uses the locale's abbreviated month and order, or a fixed order", () => {
    expect(formatDisplayDate("2026-07-04T10:00:00Z", "short", "en")).toBe("Jul 4, 2026");
    expect(formatDisplayDate("2026-07-04T10:00:00Z", "short", "en-GB")).toBe("4 Jul 2026");
    expect(formatDisplayDate("2026-06-29T10:00:00Z", "short", "en", "dmy")).toBe("29 Jun 2026");
    expect(formatDisplayDate("2026-06-29T10:00:00Z", "short", "en-GB", "mdy")).toBe("Jun 29, 2026");
    // a numeric-month locale keeps its own order
    expect(formatDisplayDate("2026-07-04T10:00:00Z", "short", "ja", "mdy")).toBe(formatDisplayDate("2026-07-04T10:00:00Z", "short", "ja"));
    expect(formatDisplayDate("soon", "short", "en")).toBe("");
    // order alone does not change the iso default
    expect(formatDisplayDate("2026-07-04T10:00:00Z", undefined, "en", "dmy")).toBe("2026-07-04");
  });
});

describe("markup", () => {
  const theme = (over: Record<string, unknown>) => parseTheme({ ...BASE, ...over });

  it("card_meta orders the meta row, with the prefix and separator", () => {
    const authorFirst = html(
      createElement(PostList, {
        posts,
        site,
        theme: theme({ post_list_variant: "cards", card_meta: "author_date", byline_prefix: "By", meta_separator: "slash" }),
      }),
    );
    expect(authorFirst).toContain(
      '<p class="post-meta post-card-meta-author">By <a href="/authors/jane-doe">Jane Doe</a> / <time dateTime="2026-11-01T09:00:00Z">2026-11-01</time></p>',
    );
    expect(authorFirst).not.toContain("post-card-byline");
    const dateFirst = html(createElement(PostList, { posts, site, theme: theme({ post_list_variant: "cards", card_meta: "date_author" }) }));
    expect(dateFirst).toContain('<time dateTime="2026-11-01T09:00:00Z">2026-11-01</time> · <a href="/authors/jane-doe">Jane Doe</a>');
  });

  it("card meta at the bottom + inline CTA join the last row", () => {
    const out = html(
      createElement(PostList, {
        posts,
        site,
        theme: theme({ post_list_variant: "cards", card_meta: "author_date", card_meta_position: "bottom", card_cta_position: "inline" }),
      }),
    );
    expect(out).toMatch(/<h2>.*?<\/h2><p class="excerpt">A short description.<\/p><p class="post-meta post-card-meta-author post-card-meta-bottom">.*<span class="post-card-cta" aria-hidden="true">/);
    // date_reading keeps the date row on top; the CTA joins the byline row
    const dr = html(createElement(PostList, { posts, site, theme: theme({ post_list_variant: "cards", card_cta_position: "inline", byline_prefix: "By" }) }));
    expect(dr).toContain('<p class="post-meta post-card-byline">By <a href="/authors/jane-doe">Jane Doe</a><span class="post-card-cta" aria-hidden="true">');
  });

  it("card_feature_first marks only the first card, with the optional label", () => {
    const out = html(
      createElement(PostList, { posts, site, theme: theme({ post_list_variant: "cards", card_feature_first: true, card_feature_label: "Latest" }) }),
    );
    expect(out.match(/post-card-feature"/g)).toHaveLength(1);
    expect(out).toContain('<li class="post-card post-card-feature"><p class="post-card-feature-label">Latest</p>');
  });

  it("numbered list: an ordered list with decorative 01/02 numbers and the date label", () => {
    const out = html(createElement(PostList, { posts, site, theme: theme({ post_list_variant: "numbered", date_format: "short", byline_prefix: "By" }) }));
    expect(out.startsWith('<ol class="post-list post-numbered"><li class="post-numbered-item"><span class="post-number" aria-hidden="true">01</span>')).toBe(true);
    expect(out).toContain('<span class="post-number" aria-hidden="true">03</span>');
    expect(out).toContain('<p class="post-meta post-numbered-date"><time dateTime="2026-11-01T09:00:00Z">Nov 1, 2026</time></p>');
    expect(out).toContain('<p class="post-meta post-numbered-byline">By <a href="/authors/jane-doe">Jane Doe</a></p>');
  });

  it("post byline: author-first order, prefix, separator", () => {
    const out = html(
      createElement(PostArticle, { post: posts[0]!, site, theme: theme({ byline_order: "author_date", byline_prefix: "By", meta_separator: "pipe" }) }),
    );
    expect(out).toContain('<p class="post-meta">By <a href="/authors/jane-doe">Jane Doe</a> | <time dateTime="2026-11-01T09:00:00Z">2026-11-01</time></p>');
  });

  it("post header: eyebrow, centered, split meta, scrim wrapper", () => {
    const out = html(
      createElement(PostArticle, {
        post: posts[0]!,
        site,
        theme: theme({ post_header_eyebrow: "Field notes", post_header_align: "center", post_meta_layout: "split", byline_prefix: "By" }),
      }),
    );
    expect(out).toMatch(
      /<header class="post-header post-header-center"><p class="post-header-eyebrow">Field notes<\/p><p class="post-meta post-meta-top"><time[^>]*>2026-11-01<\/time> · \d+ min read<\/p><h1>Getting started<\/h1><p class="post-description">A short description.<\/p><p class="post-meta">By <a href="\/authors\/jane-doe">Jane Doe<\/a><\/p><\/header>/,
    );
    const scrim = html(createElement(PostArticle, { post: posts[0]!, site, theme: theme({ pattern: "grid", pattern_strength: "bold" }) }));
    expect(scrim).toMatch(/<header class="post-header"><div class="post-header-text"><h1>/);
  });

  it("hero title accent renders as an escaped <em>", () => {
    const out = html(createElement(PostIndex, { posts, site, theme: theme({ hero: { title: "A slower way", title_accent: "<to read>" } }), page: 1, totalPages: 1 }));
    expect(out).toContain('<h1 id="index-hero-title">A slower way <em class="index-hero-title-accent">&lt;to read&gt;</em></h1>');
  });

  it("footer band always shows the brand row; columns renders link column + legal row", () => {
    const band = html(createElement(SiteFooter, { theme: theme({ footer_variant: "band" }), year: 2026 }));
    expect(band).toContain('<footer class="site-footer site-footer-band"><div class="wrap"><p class="footer-brand"><span class="footer-name">Example Blog</span></p>');
    const cols = html(
      createElement(SiteFooter, {
        theme: theme({
          footer_variant: "columns",
          footer_links_label: "Editorial",
          footer_tagline: "Notes.",
          nav_links: [{ label: "Guides", href: "/guides" }, { type: "language_switch" }],
        }),
        year: 2026,
      }),
    );
    expect(cols).toContain('<nav class="footer-links" aria-label="Footer"><p class="footer-links-label">Editorial</p><a href="/guides">Guides</a><a href="/feed.xml">RSS</a></nav>');
    expect(cols).toContain('<p class="footer-tagline">Notes.</p>');
    expect(cols).toContain('<p class="footer-legal">© 2026 Example Blog.</p>');
    const defaults = html(createElement(SiteFooter, { theme: theme({ footer_variant: "columns" }), year: 2026 }));
    expect(defaults).toContain('<p class="footer-links-label">Links</p><a href="/">Home</a><a href="/about">About</a><a href="/authors">Authors</a><a href="/feed.xml">RSS</a>');
  });
});
