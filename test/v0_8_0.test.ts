// v0.8.0: the three optional colour-role keys (link / rule / meta) and the
// leading-body-headline strip. Logic only — parsing/validation, the CSS each
// key emits (and that an absent key is byte-identical), the contrast guard on
// the text roles, and the headline helper's leading-only rule.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostArticle } from "../src/components/posts";
import { parseSiteConfig } from "../src/site/schema";
import type { Post } from "../src/content/types";
import { stripLeadingBodyHeadline } from "../src/content/html-body";
import { themeCss } from "../src/theme/css";
import { parseTheme } from "../src/theme/schema";
import { AA_CONTRAST, contrastRatio, guardAccent } from "../src/theme/palette";

const BASE = { brand_name: "Example Blog", layout_variant: "journal" };
const css = (over: Record<string, unknown>) => themeCss(parseTheme({ ...BASE, ...over }));

describe("v0.8.0 colour-role parsing", () => {
  it("keeps valid hexes and drops anything else", () => {
    const t = parseTheme({
      ...BASE,
      link_color: "#3366cc",
      rule_color: "#ABC",
      meta_color: "#808080",
    });
    expect(t.link_color).toBe("#3366cc");
    expect(t.rule_color).toBe("#ABC");
    expect(t.meta_color).toBe("#808080");
    const bad = parseTheme({ ...BASE, link_color: "red", rule_color: "rgb(0,0,0)", meta_color: "#xyzxyz" });
    expect(bad.link_color).toBeNull();
    expect(bad.rule_color).toBeNull();
    expect(bad.meta_color).toBeNull();
  });
});

describe("v0.8.0 colour-role CSS", () => {
  it("emits nothing when the keys are absent (byte-compat)", () => {
    const out = css({});
    expect(out).not.toContain("--link");
    expect(out).not.toContain("--rule");
    expect(out).not.toContain("--meta");
    expect(out).not.toContain("(v0.8.0)");
  });

  it("routes the generic link colour through --link with an underline hover", () => {
    const out = css({ link_color: "#7a1f1f" }); // dark enough to pass AA on white unchanged
    expect(out).toContain(":root{--link:#7a1f1f}");
    expect(out).toContain("a{color:var(--link)}");
    expect(out).toContain("a:hover{color:var(--link);text-decoration:underline}");
  });

  it("guards a low-contrast link colour to AA against the page background", () => {
    const out = css({ link_color: "#dddddd" });
    const guarded = guardAccent("#dddddd");
    expect(guarded).not.toBe("#dddddd");
    expect(contrastRatio(guarded, "#ffffff")).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(out).toContain(`:root{--link:${guarded}}`);
  });

  it("routes the decorative rule through --rule without guarding it", () => {
    const out = css({ rule_color: "#f0c0c0" }); // low contrast, but a bar needs none
    expect(out).toContain(":root{--rule:#f0c0c0}");
    expect(out).toContain(".accent-rule{background:var(--rule)}");
  });

  it("routes metadata text through --meta, guarded to AA", () => {
    const out = css({ meta_color: "#999999" });
    const guarded = guardAccent("#999999");
    expect(out).toContain(`:root{--meta:${guarded}}`);
    expect(out).toContain(".post-meta{color:var(--meta)}");
    expect(contrastRatio(guarded, "#ffffff")).toBeGreaterThanOrEqual(AA_CONTRAST);
  });

  it("lets a non-accent divider still override the rule colour (order)", () => {
    const out = css({ rule_color: "#336699", divider: "line" });
    const ruleAt = out.indexOf(".accent-rule{background:var(--rule)}");
    const lineAt = out.indexOf("background:var(--line)");
    expect(ruleAt).toBeGreaterThan(-1);
    expect(lineAt).toBeGreaterThan(-1);
    // The divider's `.accent-rule` block comes later, so it wins the cascade.
    expect(lineAt).toBeGreaterThan(ruleAt);
  });
});

describe("stripLeadingBodyHeadline", () => {
  it("removes the leading headline and the header it empties", () => {
    const body =
      "<article><header><h1>The Title</h1></header>" +
      "<section><h2>Why</h2><p>Body.</p></section></article>";
    expect(stripLeadingBodyHeadline(body)).toBe(
      "<article><section><h2>Why</h2><p>Body.</p></section></article>",
    );
  });

  it("removes a bare leading h1 with no header wrapper", () => {
    const body = "<article><h1>Title</h1><p>Body.</p></article>";
    expect(stripLeadingBodyHeadline(body)).toBe("<article><p>Body.</p></article>");
  });

  it("removes an h1 that carries attributes", () => {
    const body = '<article><header><h1 class="t" id="x">Title</h1></header><p>Body.</p></article>';
    expect(stripLeadingBodyHeadline(body)).toBe("<article><p>Body.</p></article>");
  });

  it("keeps an h1 that follows real content (a genuine in-body heading)", () => {
    const afterP = "<article><p>Intro.</p><h1>Later</h1></article>";
    expect(stripLeadingBodyHeadline(afterP)).toBe(afterP);
    const afterSection = "<article><section><p>x</p></section><h1>Later</h1></article>";
    expect(stripLeadingBodyHeadline(afterSection)).toBe(afterSection);
  });

  it("keeps a header that still holds other content after the headline", () => {
    const body = "<article><header><h1>Title</h1><p class=\"kicker\">Dek</p></header><p>Body.</p></article>";
    expect(stripLeadingBodyHeadline(body)).toBe(
      "<article><header><p class=\"kicker\">Dek</p></header><p>Body.</p></article>",
    );
  });

  it("strips only the first (leading) h1", () => {
    const body = "<article><header><h1>One</h1></header><section><h1>Two</h1></section></article>";
    expect(stripLeadingBodyHeadline(body)).toBe("<article><section><h1>Two</h1></section></article>");
  });

  it("returns a body with no h1 unchanged", () => {
    const body = "<article><p>First paragraph.</p><ul><li>One</li></ul></article>";
    expect(stripLeadingBodyHeadline(body)).toBe(body);
  });
});

describe("PostArticle no longer shows a duplicate headline", () => {
  const site = parseSiteConfig({
    site_name: "Example Blog",
    canonical_hostname: "blog.example.com",
    language: "en",
    authors: [{ slug: "jane-doe", name: "Jane Doe", title: "Editor", bio: "", expertise: [] }],
  });
  const post: Post = {
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
    },
    html: "<article><header><h1>Best CRM tools</h1></header><section><h2>Why</h2><p>Body.</p></section></article>",
  };

  it("renders exactly one <h1> (the template title, not the body headline)", () => {
    const out = renderToStaticMarkup(createElement(PostArticle, { post, site }) as never);
    expect(out.match(/<h1\b/g)?.length).toBe(1);
    expect(out).toContain("<h1>Best CRM tools</h1>");
    expect(out).toContain('<h2>Why</h2>');
  });
});
