// v0.6.1 fixes: the language switch renders as separate, tappable entries with
// the current language marked, and the `bar` header row wraps on a phone.
// Logic only — the emitted CSS rules and the switch's attributes/styles.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageSwitch, SiteHeader } from "../src/components/chrome";
import { PostArticle } from "../src/components/posts";
import { parseFrontmatter } from "../src/content/frontmatter";
import type { Post } from "../src/content/types";
import { themeCss } from "../src/theme/css";
import { parseTheme } from "../src/theme/schema";

const render = (el: unknown) => renderToStaticMarkup(el as never);
const ENTRIES = [
  { lang: "en", href: "/posts/guide" },
  { lang: "es", href: "/es/posts/guide-es", current: true },
];
const SITE = { authors: [{ slug: "jane-doe", name: "Jane Doe" }], language: "en", features: { sponsorDisclosure: false }, sponsor: null };
const esPost: Post = {
  slug: "guide-es",
  frontmatter: parseFrontmatter(
    { title: "Guía", status: "published", publishAt: "2026-11-01T09:00:00Z", author: "Jane Doe", authorSlug: "jane-doe", lang: "es", translationOf: "guide" },
    "guide-es",
  ),
  html: "<p>Cuerpo.</p>",
};

describe("language switch on a post page (placement: post)", () => {
  const html = render(createElement(PostArticle, { post: esPost, site: SITE as never, languageSwitch: ENTRIES }));

  it("lays the entries out as separated pills", () => {
    expect(html).toContain(
      '<span class="language-switch" role="group" aria-label="Read in another language" style="display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 4px">',
    );
  });

  it("each entry is a >= 44px tap target; the current one is marked + filled, not a link", () => {
    expect(html).toMatch(/<a href="\/posts\/guide" hrefLang="en" style="[^"]*min-width:44px;min-height:44px;[^"]*">EN<\/a>/);
    const current = /<span aria-current="true" style="([^"]*)">ES<\/span>/.exec(html)?.[1] ?? "";
    for (const decl of ["min-height:44px", "background:var(--ink)", "border-color:var(--ink)", "color:var(--bg)"]) {
      expect(current, decl).toContain(decl);
    }
    expect(html).not.toContain('href="/es/posts/guide-es"');
  });

  it("the header switch stays stylesheet-styled (no inline styles)", () => {
    const theme = parseTheme({ brand_name: "X", nav_links: [{ type: "language_switch", style: "pill" }] });
    expect(render(createElement(SiteHeader, { theme, languageSwitch: ENTRIES }))).not.toContain("style=");
    expect(render(createElement(LanguageSwitch, { entries: ENTRIES }))).not.toContain("style=");
  });
});

describe("language switch in the header nav (stylesheet)", () => {
  const css = themeCss(parseTheme({ brand_name: "X", nav_links: [{ type: "language_switch", style: "pill" }] }));

  it("gives every entry a 44px tap target and wraps", () => {
    expect(css).toContain(".site-nav .language-switch{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}");
    expect(css).toContain(
      ".site-nav .language-switch a,.site-nav .language-switch [aria-current]{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}",
    );
  });

  it("marks the current language (bold + accent underline; filled when a pill), never a dimmed color", () => {
    expect(css).toMatch(/\.site-nav \.language-switch \[aria-current\]\{color:var\(--ink\);font-weight:700;text-decoration:underline/);
    expect(css).toContain(".site-nav .language-switch .nav-pill[aria-current]{background:var(--ink);color:var(--bg);border-color:var(--ink)");
    expect(css).not.toContain("[aria-current]{color:var(--muted)");
  });

  it("is still emitted only for a theme with a language_switch entry", () => {
    expect(themeCss(parseTheme({ brand_name: "X" }))).not.toContain("language-switch");
  });
});

describe("bar header wraps on a phone", () => {
  const css = themeCss(parseTheme({ brand_name: "X", header_variant: "bar", logo_width: 184 }));

  it("wraps the row and the nav, with a small row gap", () => {
    expect(css).toContain(
      '[data-header="bar"] .site-header .wrap{max-width:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 32px}',
    );
    expect(css).toContain('[data-header="bar"] .site-nav{margin-top:0;gap:32px;font-size:15px;align-items:center;flex-wrap:wrap}');
    expect(css).toContain('@media (max-width:800px){[data-header="bar"] .site-header{padding:22px 6%}[data-header="bar"] .site-nav{gap:4px 16px;font-size:14px}}');
  });

  it("leaves the non-bar variants untouched", () => {
    for (const header_variant of ["classic", "centered", "compact"]) {
      expect(themeCss(parseTheme({ brand_name: "X", header_variant }))).not.toContain("flex-wrap:wrap;justify-content:space-between");
    }
  });
});
