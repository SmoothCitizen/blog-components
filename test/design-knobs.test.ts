// v0.6.0 design knobs. Logic only: parsing/validation of every new theme key,
// the CSS each one emits (and that nothing can inject CSS), the contrast guard
// behind the background motifs, the date / reading-time helpers, and the
// byte-compat rule — every key absent (or at its default) renders the v0.5.0
// stylesheet and markup exactly.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AuthorProfile, PostArticle, PostIndex, PostList } from "../src/components/posts";
import { SiteFooter, SiteHeader } from "../src/components/chrome";
import { MarkdownBody } from "../src/content/markdown";
import { readingMinutes } from "../src/content/reading-time";
import type { Post } from "../src/content/types";
import { parseSiteConfig } from "../src/site/schema";
import { contrastRatio, mix, AA_CONTRAST } from "../src/theme/palette";
import {
  PATTERN_WEIGHTS,
  hasPattern,
  patternImageVar,
  patternInk,
  patternVeilAlpha,
  resolveSurface,
  themeCss,
} from "../src/theme/css";
import {
  DEFAULT_MONO_FONT,
  DEFAULT_POST_LIST_CTA_LABEL,
  PATTERN_VARIANTS,
  parseHeadingWeight,
  parseTheme,
  safeLetterSpacing,
  type PatternVariant,
} from "../src/theme/schema";
import { formatDisplayDate } from "../src/util";
import { SAMPLE_MARKDOWN, SAMPLE_POSTS, SAMPLE_SITE, SAMPLE_THEMES } from "./fixtures/v0_5_0-sample";

const FIXTURE: Record<string, string> = JSON.parse(
  readFileSync(new URL("./fixtures/v0_5_0-markup.json", import.meta.url), "utf8"),
);
const html = (el: unknown) => renderToStaticMarkup(el as never);
const BASE = { brand_name: "Example Blog", layout_variant: "journal" };
const site = parseSiteConfig(SAMPLE_SITE);
const posts = SAMPLE_POSTS as unknown as Post[];

// Every v0.6.0 key at its explicit default value.
const EXPLICIT_DEFAULTS = {
  post_list_variant: "list",
  pattern: "none",
  heading_case: "none",
  nav_case: "none",
  logo_case: "none",
  meta_style: "default",
  drop_cap: false,
  list_marker: "default",
  heading_accent: false,
  date_format: "iso",
  header_align: "full",
};

describe("v0.5.0 byte-compatibility", () => {
  for (const [name, raw] of Object.entries(SAMPLE_THEMES)) {
    for (const [label, config] of [
      ["keys absent", raw],
      ["keys at explicit defaults", { ...raw, ...EXPLICIT_DEFAULTS }],
    ] as const) {
      it(`${name} theme, ${label}: themeCss + every component's markup are unchanged`, () => {
        const theme = parseTheme(config);
        const p = theme.class_prefix;
        expect(themeCss(theme)).toBe(FIXTURE[`${name}:themeCss`]);
        expect(html(createElement(SiteHeader, { theme, classPrefix: p }))).toBe(FIXTURE[`${name}:header`]);
        expect(html(createElement(SiteFooter, { theme, year: 2026, classPrefix: p }))).toBe(FIXTURE[`${name}:footer`]);
        for (const page of [1, 2]) {
          expect(html(createElement(PostIndex, { posts, site, theme, page, totalPages: 2, classPrefix: p }))).toBe(
            FIXTURE[`${name}:index${page}`],
          );
        }
        // The list / post / author components now take an optional theme:
        // passing it (with the keys at their defaults) changes nothing.
        expect(html(createElement(PostList, { posts, site, theme, classPrefix: p }))).toBe(FIXTURE[`${name}:list`]);
        expect(html(createElement(PostList, { posts, site, classPrefix: p }))).toBe(FIXTURE[`${name}:list`]);
        for (const post of posts) {
          expect(html(createElement(PostArticle, { post, site, theme, classPrefix: p }))).toBe(
            FIXTURE[`${name}:article:${post.slug}`],
          );
        }
        expect(html(createElement(AuthorProfile, { author: site.authors[0]!, posts, site, theme, classPrefix: p }))).toBe(
          FIXTURE[`${name}:author`],
        );
      });
    }
  }

  it("a markdown body without code spans or tables renders exactly as in v0.5.0", () => {
    expect(html(createElement(MarkdownBody, { source: SAMPLE_MARKDOWN }))).toBe(FIXTURE.markdown);
  });

  it("the existing v0.2.0 / v0.3.1 fixtures still hold with explicit defaults", () => {
    const read = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
    expect(themeCss(parseTheme({ brand_name: "Plain", layout_variant: "journal", ...EXPLICIT_DEFAULTS }))).toBe(
      read("v0_2_0-themecss-plain.txt"),
    );
  });
});

describe("parsing: defaults + per-key validation (never throws)", () => {
  it("defaults every key when absent", () => {
    const t = parseTheme(BASE);
    expect(t).toMatchObject({
      post_list_variant: "list",
      post_list_cta_label: null,
      pattern: "none",
      pattern_image_key: null,
      heading_weight: null,
      heading_case: "none",
      nav_case: "none",
      logo_case: "none",
      letter_spacing: null,
      meta_style: "default",
      mono_font: null,
      index_label: null,
      footer_tagline: null,
      drop_cap: false,
      list_marker: "default",
      heading_accent: false,
      date_format: "iso",
      logo_mark_key: null,
      header_align: "full",
    });
  });

  it("accepts every allowed value", () => {
    const t = parseTheme({
      ...BASE,
      post_list_variant: "cards",
      post_list_cta_label: "Continue",
      pattern: "herringbone",
      pattern_image_key: "/images/motif.svg",
      heading_weight: "600",
      heading_case: "uppercase",
      nav_case: "uppercase",
      logo_case: "uppercase",
      letter_spacing: "0.04em",
      meta_style: "mono",
      mono_font: '"Example Mono", monospace',
      index_label: "Latest",
      footer_tagline: "Short notes, written carefully.",
      drop_cap: true,
      list_marker: "accent",
      heading_accent: true,
      date_format: "long",
      logo_mark_key: "images/mark.png",
      header_align: "content",
      hero: { title: "Welcome", eyebrow: "New this week" },
    });
    expect(t).toMatchObject({
      post_list_variant: "cards",
      post_list_cta_label: "Continue",
      pattern: "herringbone",
      pattern_image_key: "images/motif.svg",
      heading_weight: 600,
      heading_case: "uppercase",
      nav_case: "uppercase",
      logo_case: "uppercase",
      letter_spacing: "0.04em",
      meta_style: "mono",
      mono_font: '"Example Mono", monospace',
      index_label: "Latest",
      footer_tagline: "Short notes, written carefully.",
      drop_cap: true,
      list_marker: "accent",
      heading_accent: true,
      date_format: "long",
      logo_mark_key: "images/mark.png",
      header_align: "content",
    });
    expect(t.hero?.eyebrow).toBe("New this week");
    for (const p of PATTERN_VARIANTS) expect(parseTheme({ ...BASE, pattern: p }).pattern).toBe(p);
    expect(parseTheme({ ...BASE, list_marker: "dash" }).list_marker).toBe("dash");
  });

  it("drops each invalid value on its own, falling back to the default", () => {
    const t = parseTheme({
      ...BASE,
      post_list_variant: "masonry",
      post_list_cta_label: "x".repeat(31),
      pattern: "plaid",
      pattern_image_key: "images/motif.jpg",
      heading_weight: 650,
      heading_case: "lowercase",
      nav_case: true,
      logo_case: "UPPERCASE",
      letter_spacing: "1vw",
      meta_style: "serif",
      mono_font: "monospace;}body{display:none",
      index_label: "x".repeat(41),
      footer_tagline: "x".repeat(121),
      drop_cap: "true",
      list_marker: "star",
      heading_accent: 1,
      date_format: "medium",
      logo_mark_key: "https://example.com/mark.png",
      header_align: "left",
      hero: { title: "Welcome", eyebrow: "x".repeat(61) },
      // a valid key alongside the invalid ones still parses
      index_label_extra: "ignored",
    });
    expect(t).toMatchObject({ ...parseTheme(BASE), hero: { title: "Welcome", eyebrow: null } });
  });

  it("heading_weight: 300-900 in steps of 100 only", () => {
    for (const ok of [300, 400, 500, 600, 700, 800, 900, "700"]) expect(parseHeadingWeight(ok)).toBe(Number(ok));
    for (const bad of [200, 1000, 350, 600.5, "bold", "", null, "600;}", NaN]) expect(parseHeadingWeight(bad)).toBeNull();
  });

  it("letter_spacing: a short em/rem/px length or 0, nothing else", () => {
    for (const ok of ["0", "0.04em", ".1em", "-0.02em", "1px", "-0.5px", "0.125rem", "12px"]) {
      expect(safeLetterSpacing(ok), ok).toBe(ok);
    }
    for (const bad of ["1vw", "normal", "0.04", "0.04em;color:red", "100px", "0.1234em", "--x", "1em}", "calc(1em)"]) {
      expect(safeLetterSpacing(bad), bad).toBeNull();
    }
  });

  it("pattern_image_key / logo_mark_key go through safePublicPath", () => {
    for (const bad of ["../x.svg", "//example.com/x.svg", "https://example.com/x.svg", 'x.svg")', "x .svg", "data:x.svg"]) {
      expect(parseTheme({ ...BASE, pattern_image_key: bad }).pattern_image_key, bad).toBeNull();
      expect(parseTheme({ ...BASE, logo_mark_key: bad }).logo_mark_key, bad).toBeNull();
    }
    expect(parseTheme({ ...BASE, pattern_image_key: "motif.webp" }).pattern_image_key).toBe("motif.webp");
    expect(parseTheme({ ...BASE, pattern_image_key: "motif.gif" }).pattern_image_key).toBeNull();
    expect(parseTheme({ ...BASE, logo_mark_key: "/mark.svg" }).logo_mark_key).toBe("mark.svg");
  });
});

describe("CSS output", () => {
  const css = (over: Record<string, unknown>) => themeCss(parseTheme({ ...BASE, ...over }));

  it("emits each knob's rules only when set", () => {
    expect(css({ post_list_variant: "cards" })).toContain("[data-layout] .post-list.post-cards{display:grid");
    expect(css({ heading_weight: 300 })).toContain("h1,h2,h3,h4,[data-layout] .post-list h2,.post-faq dt{font-weight:300}");
    expect(css({ heading_case: "uppercase", letter_spacing: "0.04em" })).toContain(
      "h1,h2,h3,h4{text-transform:uppercase;letter-spacing:0.04em}",
    );
    expect(css({ heading_case: "uppercase" })).toContain("h1,h2,h3,h4{text-transform:uppercase}");
    expect(css({ nav_case: "uppercase", letter_spacing: "1px" })).toContain(".site-nav{text-transform:uppercase;letter-spacing:1px}");
    expect(css({ logo_case: "uppercase" })).toContain(".site-header .brand .name,.site-footer .footer-name{text-transform:uppercase}");
    // letter_spacing alone does nothing (it rides on an uppercase case)
    expect(css({ letter_spacing: "0.04em" })).toBe(css({}));
    expect(css({ index_label: "Latest" })).toContain(".index-label::after{");
    expect(css({ footer_tagline: "Notes" })).toContain(".site-footer .footer-tagline{");
    expect(css({ logo_mark_key: "mark.svg" })).toContain(".logo-mark{display:block;height:28px");
    expect(css({ hero: { title: "T", eyebrow: "E" } })).toContain(".index-hero .index-hero-eyebrow{");
    expect(css({ hero: { title: "T" } })).not.toContain("index-hero-eyebrow");
    expect(css({ list_marker: "accent" })).toContain(".post-body li::marker{color:var(--accent)}");
    expect(css({ list_marker: "dash" })).toContain('.post-body ul>li::before{content:"\\2013"');
    expect(css({ heading_accent: true })).toContain(".post-body h2::before{");
    expect(css({ header_align: "content" })).toContain("[data-header] .site-header .wrap{max-width:820px");
  });

  it("drop cap: first paragraph's first letter in the accent, not on rtl pages", () => {
    const out = css({ drop_cap: true });
    expect(out).toContain('html:not([dir="rtl"]) .post-body>p:first-of-type::first-letter');
    expect(out).toMatch(/::first-letter\{float:left;[^}]*color:var\(--accent\)/);
  });

  it("meta_style mono uses mono_font, else the default mono stack; mono_font alone does nothing", () => {
    expect(css({ meta_style: "mono", mono_font: '"Example Mono", monospace' })).toContain(
      '.post-meta,.index-label,.index-hero .index-hero-eyebrow,.post-card-cta{font-family:"Example Mono", monospace;',
    );
    expect(css({ meta_style: "mono" })).toContain(`font-family:${DEFAULT_MONO_FONT};`);
    expect(css({ mono_font: "monospace" })).toBe(css({}));
  });

  it("class_prefix namespaces every new selector", () => {
    const out = css({ class_prefix: "exb", post_list_variant: "cards", index_label: "Latest", logo_mark_key: "m.svg" });
    expect(out).toContain(".exb-post-list.exb-post-cards");
    expect(out).toContain(".exb-index-label::after");
    expect(out).not.toMatch(/[^-]\.post-card\b/);
  });

  it("no value reaches the stylesheet unvalidated", () => {
    const evil = "x;}</style><script>alert(1)</script>";
    const out = css({
      heading_weight: evil,
      letter_spacing: evil,
      mono_font: evil,
      meta_style: "mono",
      heading_case: "uppercase",
      pattern: evil,
      pattern_image_key: `${evil}.svg`,
      post_list_cta_label: evil,
      index_label: evil,
    });
    expect(out).not.toContain("</style>");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("--pattern-image");
  });
});

describe("background motif + contrast guard", () => {
  const css = (over: Record<string, unknown>) => themeCss(parseTheme({ ...BASE, ...over }));
  const DARK = { bg: "#0f172a", ink: "#e2e8f0", muted: "#94a3b8", line: "#1e293b" };
  const builtIns = PATTERN_VARIANTS.filter((p): p is Exclude<PatternVariant, "none"> => p !== "none");

  it("draws each built-in motif on the hero + post header", () => {
    for (const p of builtIns) {
      const out = css({ pattern: p });
      expect(out, p).toMatch(new RegExp(`\\.index-hero,\\.post-header\\{--pattern-ink:#[0-9a-f]{6};background-image:`));
      expect(out, p).toContain(".post-header{padding:22px 20px");
    }
    expect(css({ pattern: "none" })).not.toContain("--pattern-ink");
  });

  it("the motif color keeps the ink + muted text readable on light and dark surfaces", () => {
    const accents = ["#7a1f1f", "#1f2a44", "#2f855a", "#b7791f", "#e53e3e", "#ffffff", "#000000"];
    for (const surface of [null, DARK, { bg: "#fffaf0", ink: "#1a1a1a", muted: "#5b6572", line: "#e3e6ea" }]) {
      const s = resolveSurface(surface);
      for (const accent of accents) {
        for (const p of builtIns) {
          const ink = patternInk(p, accent, s);
          if (!ink) continue;
          for (const text of [s.ink, s.muted]) {
            const need = Math.min(AA_CONTRAST, contrastRatio(text, s.bg));
            expect(contrastRatio(text, ink), `${p} ${accent} on ${s.bg}`).toBeGreaterThanOrEqual(need);
          }
          expect(ink).not.toBe(s.bg);
        }
      }
    }
  });

  it("steps the motif weight down rather than dropping below contrast, and drops it if nothing passes", () => {
    const s = resolveSurface(null);
    const dots = patternInk("dots", "#000000", s);
    expect(dots).not.toBeNull();
    expect(dots).not.toBe(mix("#000000", s.bg, PATTERN_WEIGHTS.dots)); // stepped down from the full weight
    // a muted color already below AA leaves no room: any darkening motif fails
    expect(contrastRatio("#777777", s.bg)).toBeLessThan(AA_CONTRAST);
    expect(patternInk("grid", "#000000", { ...s, muted: "#777777" })).toBeNull();
    expect(css({ pattern: "dots", surface: { bg: "#ffffff", ink: "#1a1a1a", muted: "#777777", line: "#e3e6ea" } })).not.toContain(
      "--pattern-ink",
    );
  });

  it("a custom image sits under a surface veil that keeps text contrast for any image pixel", () => {
    for (const surface of [null, DARK]) {
      const s = resolveSurface(surface);
      const a = patternVeilAlpha([s.bg, s.panel], [s.ink, s.muted]);
      expect(a).toBeGreaterThanOrEqual(0.82);
      expect(a).toBeLessThanOrEqual(1);
      for (const base of [s.bg, s.panel]) {
        for (const px of ["#000000", "#ffffff"]) {
          const seen = mix(base, px, a);
          expect(contrastRatio(s.ink, seen)).toBeGreaterThanOrEqual(AA_CONTRAST);
          expect(contrastRatio(s.muted, seen)).toBeGreaterThanOrEqual(Math.min(AA_CONTRAST, contrastRatio(s.muted, base)));
        }
      }
    }
  });

  it("the image url is appended after class prefixing (extension untouched) and wins over a pattern", () => {
    const out = css({ class_prefix: "exb", pattern: "dots", pattern_image_key: "images/motif.svg" });
    expect(out.endsWith(':root{--pattern-image:url("/images/motif.svg")}')).toBe(true);
    expect(out).toContain(".exb-index-hero{background-image:linear-gradient(rgba(");
    expect(out).toContain("var(--pattern-image)");
    expect(out).not.toContain("--pattern-ink");
    expect(patternImageVar("x.svg\")}body{")).toBe("");
  });

  it("hasPattern drives the post header wrapper", () => {
    expect(hasPattern({})).toBe(false);
    expect(hasPattern({ pattern: "none" })).toBe(false);
    expect(hasPattern({ pattern: "grid" })).toBe(true);
    expect(hasPattern({ pattern_image_key: "m.png" })).toBe(true);
    expect(hasPattern({ pattern_image_key: "../m.png" })).toBe(false);
    const post = posts[0]!;
    const plain = html(createElement(PostArticle, { post, site, theme: parseTheme(BASE) }));
    const patterned = html(createElement(PostArticle, { post, site, theme: parseTheme({ ...BASE, pattern: "dots" }) }));
    expect(plain).not.toContain("post-header");
    expect(patterned).toMatch(/<header class="post-header"><h1>Getting started<\/h1>.*<\/p><\/header><hr/);
  });
});

describe("post cards", () => {
  const cardsTheme = parseTheme({ ...BASE, post_list_variant: "cards" });

  it("renders one card per post with date, reading time, excerpt, byline and an aria-hidden CTA", () => {
    const out = html(createElement(PostList, { posts, site, theme: cardsTheme }));
    expect(out.startsWith('<ul class="post-list post-cards">')).toBe(true);
    expect(out.match(/<li class="post-card">/g)).toHaveLength(posts.length);
    expect(out).toContain(`${readingMinutes(SAMPLE_MARKDOWN)} min read`);
    expect(out).toContain('<p class="excerpt">A short description.</p>');
    expect(out).toContain('<p class="post-meta post-card-byline"><a href="/authors/jane-doe">Jane Doe</a></p>');
    expect(out).toContain(`<span class="post-card-cta" aria-hidden="true">${DEFAULT_POST_LIST_CTA_LABEL}</span>`);
    // the title is the card's one post link (the CTA is not a second link)
    expect(out.match(/href="\/posts\/getting-started"/g)).toHaveLength(1);
    expect(out).toContain('href="/es/posts/hola"');
  });

  it("uses the configured CTA label, the date format and the prefix", () => {
    const theme = parseTheme({ ...BASE, post_list_variant: "cards", post_list_cta_label: "Continue", date_format: "long", class_prefix: "exb" });
    const out = html(createElement(PostList, { posts, site, theme, classPrefix: "exb" }));
    expect(out).toContain('<span class="exb-post-card-cta" aria-hidden="true">Continue</span>');
    expect(out).toContain(">November 1, 2026</time>");
    expect(out).toContain(">1 de noviembre de 2026</time>"); // the Spanish post, in its own language
  });

  it("PostIndex and AuthorProfile pass the theme through", () => {
    expect(html(createElement(PostIndex, { posts, site, theme: cardsTheme, page: 1, totalPages: 1 }))).toContain("post-cards");
    expect(html(createElement(AuthorProfile, { author: site.authors[0]!, posts, site, theme: cardsTheme }))).toContain(
      "post-cards",
    );
  });
});

describe("labels, mark, eyebrow", () => {
  it("index_label renders a divider above the list on every index page", () => {
    const theme = parseTheme({ ...BASE, index_label: "Latest" });
    for (const page of [1, 2]) {
      const out = html(createElement(PostIndex, { posts, site, theme, page, totalPages: 2 }));
      expect(out).toContain('<p class="index-label"><span>Latest</span></p><ul class="post-list">');
    }
    const withHero = parseTheme({ ...BASE, index_label: "Latest", hero: { title: "Hi", eyebrow: "Weekly" } });
    const out = html(createElement(PostIndex, { posts, site, theme: withHero, page: 1, totalPages: 1 }));
    expect(out).toContain('<p class="index-hero-eyebrow">Weekly</p><h1 id="index-hero-title">Hi</h1>');
    expect(out).toContain('</section><p class="index-label">');
  });

  it("logo mark renders before the text wordmark (not with a logo image) in header + footer", () => {
    const theme = parseTheme({ ...BASE, logo_mark_key: "images/mark.svg", footer_tagline: "Short notes." });
    const header = html(createElement(SiteHeader, { theme }));
    expect(header).toContain('<img class="logo-mark" src="/images/mark.svg" alt="" height="28"/><span class="name">Example Blog</span>');
    const footer = html(createElement(SiteFooter, { theme, year: 2026 }));
    expect(footer).toContain(
      '<p class="footer-brand"><img class="logo-mark" src="/images/mark.svg" alt="" height="22"/><span class="footer-name">Example Blog</span></p><p class="footer-tagline">Short notes.</p>',
    );
    const withLogo = parseTheme({ ...BASE, logo_mark_key: "images/mark.svg", logo_key: "images/logo.png" });
    expect(html(createElement(SiteHeader, { theme: withLogo }))).not.toContain("logo-mark");
    const taglineOnly = html(createElement(SiteFooter, { theme: parseTheme({ ...BASE, footer_tagline: "T" }), year: 2026 }));
    expect(taglineOnly).toContain('<p class="footer-tagline">T</p>');
    expect(taglineOnly).not.toContain("footer-brand");
  });

  it("text knobs render as escaped text", () => {
    const theme = parseTheme({ ...BASE, index_label: "<b>x</b>", footer_tagline: "<script>y</script>" });
    expect(html(createElement(PostIndex, { posts, site, theme, page: 1, totalPages: 1 }))).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html(createElement(SiteFooter, { theme, year: 2026 }))).toContain("&lt;script&gt;y&lt;/script&gt;");
  });
});

describe("formatDisplayDate", () => {
  it("iso is the existing YYYY-MM-DD", () => {
    expect(formatDisplayDate("2026-11-09T10:00:00Z", "iso", "en")).toBe("2026-11-09");
    expect(formatDisplayDate("2026-11-09T10:00:00Z", undefined, "en")).toBe("2026-11-09");
  });

  it("long is locale-aware for the page language, in UTC", () => {
    expect(formatDisplayDate("2026-11-09T10:00:00Z", "long", "en")).toBe("November 9, 2026");
    expect(formatDisplayDate("2026-11-09T10:00:00Z", "long", "en-GB")).toBe("9 November 2026");
    expect(formatDisplayDate("2026-11-09T10:00:00Z", "long", "es")).toBe("9 de noviembre de 2026");
    expect(formatDisplayDate("2026-11-09T10:00:00Z", "long", "de")).toBe("9. November 2026");
    // late evening west of UTC is already the next day in UTC — never the build machine's zone
    expect(formatDisplayDate("2026-11-09T23:30:00-05:00", "long", "en")).toBe("November 10, 2026");
  });

  it("an invalid tag falls back to en; an unparseable date is empty", () => {
    expect(formatDisplayDate("2026-11-09T10:00:00Z", "long", "not a tag!")).toBe("November 9, 2026");
    expect(formatDisplayDate("soon", "long", "en")).toBe("");
  });

  it("PostArticle shows the long date in the post's language", () => {
    const theme = parseTheme({ ...BASE, date_format: "long" });
    const out = html(createElement(PostArticle, { post: posts[2]!, site, theme }));
    expect(out).toContain('<time dateTime="2026-11-01T09:00:00Z">1 de noviembre de 2026</time>');
  });
});

describe("readingMinutes", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

  it("rounds words up to whole minutes at 230 wpm, at least 1", () => {
    expect(readingMinutes("Hello there.")).toBe(1);
    expect(readingMinutes(words(230))).toBe(1);
    expect(readingMinutes(words(231))).toBe(2);
    expect(readingMinutes(words(1150))).toBe(5);
  });

  it("ignores markup and counts unspaced scripts per character", () => {
    expect(readingMinutes(`<article><p>${words(460)}</p><img src="/a.png" alt=""></article>`)).toBe(2);
    expect(readingMinutes(`## Title\n\n- **${words(229)}** [link](https://example.com/a/very/long/url)`)).toBe(2);
    expect(readingMinutes("あ".repeat(1000))).toBe(2);
    expect(readingMinutes("")).toBe(0);
    expect(readingMinutes("<p></p> --- **")).toBe(0);
  });
});
