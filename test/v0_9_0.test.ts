// v0.9.0: the optional "back to all posts" link above the post title block.
// Logic only — parsing/validation of the two keys, the CSS the `post_back_link`
// key emits (and that an absent key is byte-identical), the localized default
// label, the index href for a default-language post and an `es` variant, the
// label override, and the class prefix.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostArticle } from "../src/components/posts";
import { parseSiteConfig } from "../src/site/schema";
import type { Post } from "../src/content/types";
import { defaultBackLabel } from "../src/content/languages";
import { themeCss } from "../src/theme/css";
import { parseTheme, POST_BACK_LABEL_MAX } from "../src/theme/schema";

const BASE = { brand_name: "Example Blog", layout_variant: "journal" };
const css = (over: Record<string, unknown>) => themeCss(parseTheme({ ...BASE, ...over }));

const site = parseSiteConfig({
  site_name: "Example Blog",
  canonical_hostname: "blog.example.com",
  language: "en",
  authors: [{ slug: "jane-doe", name: "Jane Doe", title: "Editor", bio: "", expertise: [] }],
});

const post = (over: Record<string, unknown> = {}): Post => ({
  slug: "best-crm",
  frontmatter: {
    title: "Best CRM tools",
    description: null,
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
    bodyFormat: "html",
    paidBrands: [],
    otherBrands: [],
    ...over,
  },
  html: "<article><h2>Why</h2><p>Body.</p></article>",
});

const render = (post: Post, theme?: Record<string, unknown>, classPrefix?: string) =>
  renderToStaticMarkup(
    createElement(PostArticle, {
      post,
      site,
      theme: theme ? parseTheme({ ...BASE, ...theme }) : undefined,
      classPrefix,
    }) as never,
  );

describe("v0.9.0 post-back parsing", () => {
  it("defaults off / null when the keys are absent", () => {
    const t = parseTheme({ ...BASE });
    expect(t.post_back_link).toBe(false);
    expect(t.post_back_label).toBeNull();
  });

  it("reads a true flag and a bounded label, dropping anything invalid", () => {
    const t = parseTheme({ ...BASE, post_back_link: true, post_back_label: "Back to the blog" });
    expect(t.post_back_link).toBe(true);
    expect(t.post_back_label).toBe("Back to the blog");

    expect(parseTheme({ ...BASE, post_back_link: "yes" }).post_back_link).toBe(false);
    expect(parseTheme({ ...BASE, post_back_label: "x".repeat(POST_BACK_LABEL_MAX + 1) }).post_back_label).toBeNull();
    expect(parseTheme({ ...BASE, post_back_label: 42 }).post_back_label).toBeNull();
  });
});

describe("defaultBackLabel", () => {
  it("localizes the known languages and falls back to English", () => {
    expect(defaultBackLabel("en")).toBe("All posts");
    expect(defaultBackLabel("es")).toBe("Todas las entradas");
    expect(defaultBackLabel("ja")).toBe("記事一覧");
    expect(defaultBackLabel("fr")).toBe("Tous les articles");
    expect(defaultBackLabel("de")).toBe("Alle Beiträge");
    expect(defaultBackLabel("pt")).toBe("Todos os artigos");
    // base subtag, case-insensitive
    expect(defaultBackLabel("PT-BR")).toBe("Todos os artigos");
    // unknown / blank → English
    expect(defaultBackLabel("it")).toBe("All posts");
    expect(defaultBackLabel("")).toBe("All posts");
    expect(defaultBackLabel(null)).toBe("All posts");
  });
});

describe("v0.9.0 post-back CSS", () => {
  it("emits nothing when the key is absent (byte-compat)", () => {
    const out = css({});
    expect(out).not.toContain(".post-back");
    expect(out).not.toContain("(v0.9.0)");
  });

  it("emits the rule only when enabled, muted via --meta with a hover underline", () => {
    const out = css({ post_back_link: true });
    expect(out).toContain("/* post back link (v0.9.0) */");
    expect(out).toContain(".post-back{margin:0 0 18px}");
    expect(out).toContain("color:var(--meta,var(--muted))");
    expect(out).toContain("min-height:32px");
    expect(out).toContain(".post-back a:hover{color:var(--meta,var(--muted));text-decoration:underline}");
  });
});

describe("v0.9.0 post-back markup", () => {
  it("renders no breadcrumb when the key is absent or false", () => {
    expect(render(post())).not.toContain("post-back");
    expect(render(post(), {})).not.toContain("post-back");
    expect(render(post(), { post_back_link: false })).not.toContain("post-back");
  });

  it("links to the root index for a default-language post, label localized, arrow aria-hidden", () => {
    const out = render(post(), { post_back_link: true });
    expect(out).toContain('<nav class="post-back" aria-label="Breadcrumb">');
    expect(out).toContain('<a href="/">');
    expect(out).toContain('<span aria-hidden="true">←</span> All posts</a>');
  });

  it("links to the language index for an es variant, label localized", () => {
    const out = render(post({ lang: "es", translationOf: "best-crm" }), { post_back_link: true });
    expect(out).toContain('<a href="/es/">');
    expect(out).toContain("Todas las entradas</a>");
  });

  it("uses the custom label over the localized default", () => {
    const out = render(post({ lang: "es" }), { post_back_link: true, post_back_label: "Volver" });
    expect(out).toContain('<a href="/es/">');
    expect(out).toContain("Volver</a>");
    expect(out).not.toContain("Todas las entradas");
  });

  it("applies the class prefix", () => {
    const out = render(post(), { post_back_link: true }, "ex");
    expect(out).toContain('<nav class="ex-post-back" aria-label="Breadcrumb">');
  });

  it("renders the breadcrumb before the title block", () => {
    const out = render(post(), { post_back_link: true });
    expect(out.indexOf("post-back")).toBeLessThan(out.indexOf("<h1>"));
  });
});
