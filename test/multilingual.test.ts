// v0.4.0 multilingual surfaces: language resolution + direction, the family /
// routing helpers, per-language sitemap + feed, the `language_switch` nav entry
// and switcher component, the `logo_href` brand link, and a v0.3.1
// byte-compatibility fixture (a config that sets none of the v0.4.0 keys must
// render exactly as it did at v0.3.1).

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "../src/content/frontmatter";
import {
  baseLang,
  dirForLang,
  familyRootSlug,
  isDefaultLang,
  isRtlLang,
  languagesPresent,
  nonDefaultLanguages,
  postLang,
  postsInLanguage,
  translationFamily,
} from "../src/content/languages";
import type { Post } from "../src/content/types";
import { langFeedPath, langIndexPath, postPathFor, postUrlFor } from "../src/seo/urls";
import { rssXml, sitemapXml } from "../src/seo/feeds";
import { themeCss } from "../src/theme/css";
import { isSafeNavHref, parseTheme } from "../src/theme/schema";
import { htmlAttributes, LanguageSwitch, SiteHeader } from "../src/components/chrome";
import { PostArticle, PostList } from "../src/components/posts";
import type { SiteConfig } from "../src/site/schema";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const read = (name: string) => readFileSync(join(fixtures, name), "utf8");
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

const SITE: SiteConfig = {
  site_name: "Example",
  canonical_hostname: "blog.example.com",
  language: "en",
  description: "Notes",
  authors: [{ slug: "jane-doe", name: "Jane Doe", title: null, bio: null, expertise: [] }],
  features: { sponsorDisclosure: false },
  sponsor: null,
};

const base = {
  title: "A post",
  status: "published",
  publishAt: "2026-11-01T09:00:00Z",
  author: "Jane Doe",
  authorSlug: "jane-doe",
};
const post = (slug: string, overrides: Record<string, unknown> = {}): Post => ({
  slug,
  frontmatter: parseFrontmatter({ ...base, ...overrides }, slug),
  html: "<p>body</p>",
});

describe("v0.3.1 byte-compatibility", () => {
  const config031 = {
    brand_name: "Example Co",
    tagline: "Notes on building Example Co",
    palette: { primary: "#7a1f1f", secondary: "#f3e9d2" },
    header_variant: "bar",
    logo_key: "images/logo.png",
    logo_width: 180,
    class_prefix: "exr",
    surface: { bg: "#0f172a", ink: "#e2e8f0", muted: "#94a3b8", line: "#1e293b" },
    nav_links: [
      { label: "Pricing", href: "/pricing", style: "pill" },
      { label: "Docs", href: "https://docs.example.com" },
    ],
  };

  it("SiteHeader + themeCss are byte-identical to the captured v0.3.1 output", () => {
    const theme = parseTheme(config031);
    expect(render(createElement(SiteHeader, { theme, classPrefix: "exr" }))).toBe(read("v0_3_1-header.txt"));
    expect(themeCss(theme)).toBe(read("v0_3_1-themecss.txt"));
  });

  it("a config with no v0.4.0 keys emits none of the v0.4.0 CSS/markup markers", () => {
    const theme = parseTheme(config031);
    expect(themeCss(theme)).not.toContain("language-switch");
    const header = render(createElement(SiteHeader, { theme }));
    expect(header).not.toContain("language-switch");
    // Default logo_href → the brand link is still plain "/".
    expect(header).toContain('href="/" aria-label="Example Co home"');
  });
});

describe("language direction", () => {
  it("is rtl for ar/he/fa/ur (base subtag) and ltr otherwise", () => {
    for (const lang of ["ar", "he", "fa", "ur", "ar-EG", "AR", "fa-IR"]) {
      expect(isRtlLang(lang), lang).toBe(true);
      expect(dirForLang(lang)).toBe("rtl");
    }
    for (const lang of ["en", "ja", "es", "zh-Hant", "de", ""]) {
      expect(isRtlLang(lang), lang).toBe(false);
      expect(dirForLang(lang)).toBe("ltr");
    }
  });

  it("baseLang takes the lowercased primary subtag", () => {
    expect(baseLang("ZH-Hant")).toBe("zh");
    expect(baseLang("en")).toBe("en");
    expect(baseLang(null)).toBe("");
  });
});

describe("family + language helpers", () => {
  const en = post("guide");
  const es = post("guide-es", { lang: "es", translationOf: "guide" });
  const ar = post("guide-ar", { lang: "ar", translationOf: "guide" });
  const other = post("unrelated", { lang: "es" });
  const live = [en, es, ar, other];

  it("resolves a post's language and the family root slug", () => {
    expect(postLang(en, "en")).toBe("en");
    expect(postLang(es, "en")).toBe("es");
    expect(isDefaultLang(en, "en")).toBe(true);
    expect(isDefaultLang(es, "en")).toBe(false);
    expect(familyRootSlug(en)).toBe("guide");
    expect(familyRootSlug(es)).toBe("guide");
  });

  it("groups a family (default first) regardless of which member asks", () => {
    expect(translationFamily(ar, live, "en").map((p) => p.slug)).toEqual(["guide", "guide-ar", "guide-es"]);
    // `unrelated` is a different root even though it is also es.
    expect(translationFamily(other, live, "en").map((p) => p.slug)).toEqual(["unrelated"]);
  });

  it("lists non-default languages with posts and every language present", () => {
    expect(nonDefaultLanguages(live, "en")).toEqual(["ar", "es"]);
    expect(languagesPresent(live, "en")).toEqual(["en", "ar", "es"]);
    expect(postsInLanguage(live, "es", "en").map((p) => p.slug)).toEqual(["guide-es", "unrelated"]);
    expect(postsInLanguage(live, "en", "en").map((p) => p.slug)).toEqual(["guide"]);
  });
});

describe("routing helpers", () => {
  it("keeps default-language posts un-prefixed and prefixes the rest", () => {
    expect(postPathFor(post("x"), "en")).toBe("/posts/x");
    expect(postPathFor(post("y", { lang: "en" }), "en")).toBe("/posts/y");
    expect(postPathFor(post("z", { lang: "es" }), "en")).toBe("/es/posts/z");
    expect(postUrlFor(SITE, post("z", { lang: "ar" }), "en")).toBe("https://blog.example.com/ar/posts/z");
  });

  it("builds per-language index + feed paths", () => {
    expect(langIndexPath("en", "en")).toBe("/");
    expect(langIndexPath("es", "en")).toBe("/es/");
    expect(langFeedPath("en", "en")).toBe("/feed.xml");
    expect(langFeedPath("es", "en")).toBe("/es/feed.xml");
  });
});

describe("sitemap + feeds (multilingual)", () => {
  const en = post("guide", { updatedAt: "2026-11-03T00:00:00Z" });
  const es = post("guide-es", { lang: "es", translationOf: "guide" });
  const live = [en, es];

  it("lists per-language index/feed and xhtml:link alternates for a family", () => {
    const xml = sitemapXml(SITE, live, 1);
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain("<loc>https://blog.example.com/es/</loc>");
    expect(xml).toContain("<loc>https://blog.example.com/es/feed.xml</loc>");
    expect(xml).toContain("<loc>https://blog.example.com/posts/guide</loc>");
    expect(xml).toContain("<loc>https://blog.example.com/es/posts/guide-es</loc>");
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://blog.example.com/posts/guide"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="es" href="https://blog.example.com/es/posts/guide-es"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://blog.example.com/posts/guide"/>');
  });

  it("builds a per-language RSS feed with the language's posts and self link", () => {
    const theme = parseTheme({ brand_name: "Example Co" });
    const feed = rssXml(SITE, theme, postsInLanguage(live, "es", "en"), { lang: "es" });
    expect(feed).toContain("<language>es</language>");
    expect(feed).toContain('href="https://blog.example.com/es/feed.xml"');
    expect(feed).toContain("<link>https://blog.example.com/es/posts/guide-es</link>");
    expect(feed).not.toContain("guide<"); // the en post is not in the es feed
  });
});

describe("logo_href", () => {
  it("validates like a nav href", () => {
    expect(parseTheme({ brand_name: "X", logo_href: "/" }).logo_href).toBe("/");
    expect(parseTheme({ brand_name: "X", logo_href: "/home" }).logo_href).toBe("/home");
    expect(parseTheme({ brand_name: "X", logo_href: "https://example.com" }).logo_href).toBe("https://example.com");
    for (const bad of ["javascript:x", "http://x.com", "//evil.com", "mailto:a@b.c", "", "   "]) {
      expect(parseTheme({ brand_name: "X", logo_href: bad }).logo_href, bad).toBeNull();
      // sanity: the parser agrees with isSafeNavHref for non-blank values
      if (bad.trim()) expect(isSafeNavHref(bad)).toBe(false);
    }
    expect(parseTheme({ brand_name: "X" }).logo_href).toBeNull();
  });

  it("points the brand link at logo_href and keeps the home aria-label", () => {
    const internal = parseTheme({ brand_name: "Acme", logo_href: "/start" });
    const html = render(createElement(SiteHeader, { theme: internal }));
    expect(html).toContain('href="/start" aria-label="Acme home"');
    expect(html).not.toMatch(/href="\/start"[^>]*rel=/);

    const external = parseTheme({ brand_name: "Acme", logo_href: "https://acme.example.com" });
    const extHtml = render(createElement(SiteHeader, { theme: external }));
    expect(extHtml).toMatch(/href="https:\/\/acme\.example\.com" aria-label="Acme home" rel="noopener"/);

    // default: unchanged plain home link
    expect(render(createElement(SiteHeader, { theme: parseTheme({ brand_name: "Acme" }) }))).toContain(
      'href="/" aria-label="Acme home"',
    );
  });
});

describe("language_switch nav entry + switcher", () => {
  it("parses a language_switch entry alongside plain links (byte-compat)", () => {
    const theme = parseTheme({
      brand_name: "X",
      nav_links: [
        { label: "Home", href: "/" },
        { type: "language_switch", style: "pill" },
      ],
    });
    expect(theme.nav_links[0]).toMatchObject({ type: "link", label: "Home", href: "/" });
    expect(theme.nav_links[1]).toMatchObject({ type: "language_switch", style: "pill", label: "", href: "" });
  });

  it("LanguageSwitch renders uppercased links/pills and marks the current language", () => {
    const entries = [
      { lang: "en", href: "/", current: true },
      { lang: "es", href: "/es/" },
    ];
    const pill = render(createElement(LanguageSwitch, { entries, style: "pill" }));
    expect(pill).toContain(">EN<");
    expect(pill).toContain('href="/es/"');
    expect(pill).toContain('aria-current="true"');
    expect(pill).toContain('class="nav-pill"');
    // a single-entry (single-language) switch renders nothing
    expect(render(createElement(LanguageSwitch, { entries: [{ lang: "en", href: "/" }] }))).toBe("");
  });

  it("SiteHeader renders the switcher for a language_switch entry, hidden when single-language", () => {
    const theme = parseTheme({ brand_name: "X", nav_links: [{ type: "language_switch" }] });
    const entries = [
      { lang: "en", href: "/", current: true },
      { lang: "ja", href: "/ja/" },
    ];
    const html = render(createElement(SiteHeader, { theme, languageSwitch: entries }));
    expect(html).toContain("language-switch");
    expect(html).toContain(">JA<");
    // no entries → switcher hidden
    expect(render(createElement(SiteHeader, { theme, languageSwitch: [] }))).not.toContain("language-switch");
  });
});

describe("post components (language-aware)", () => {
  it("PostList links each post at its language-aware path", () => {
    const en = post("guide");
    const es = post("guide-es", { lang: "es", translationOf: "guide" });
    const html = render(createElement(PostList, { posts: [en, es], site: SITE }));
    expect(html).toContain('href="/posts/guide"');
    expect(html).toContain('href="/es/posts/guide-es"');
  });

  it("PostArticle renders a sibling switch when given >1 language entry", () => {
    const es = post("guide-es", { lang: "es", translationOf: "guide" });
    const entries = [
      { lang: "en", href: "/posts/guide" },
      { lang: "es", href: "/es/posts/guide-es", current: true },
    ];
    const html = render(createElement(PostArticle, { post: es, site: SITE, languageSwitch: entries }));
    expect(html).toContain("language-switch");
    expect(html).toContain('href="/posts/guide"');
    // no siblings → no switch
    expect(render(createElement(PostArticle, { post: es, site: SITE }))).not.toContain("language-switch");
  });

  it("htmlAttributes sets lang + dir from the page language", () => {
    const theme = parseTheme({ brand_name: "X" });
    expect(htmlAttributes("en", theme)).toMatchObject({ lang: "en", dir: "ltr" });
    expect(htmlAttributes("ar", theme)).toMatchObject({ lang: "ar", dir: "rtl" });
    // the legacy { language } call shape still works
    expect(htmlAttributes({ language: "he" }, theme)).toMatchObject({ lang: "he", dir: "rtl" });
  });
});
