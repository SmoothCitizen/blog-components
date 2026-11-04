import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAllPosts, parsePostSource } from "../src/content/loader";
import { parseFrontmatter } from "../src/content/frontmatter";
import { hreflangAlternates } from "../src/content/hreflang";
import { isServable, livePosts, paginate } from "../src/content/visibility";
import type { Post } from "../src/content/types";

const NOW = new Date("2026-11-05T12:00:00Z");
const SITE = { canonical_hostname: "blog.example.com", language: "en" };

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

describe("parseFrontmatter", () => {
  it("parses the publisher's frontmatter shape", () => {
    const fm = parseFrontmatter(
      {
        ...base,
        description: "Desc",
        updatedAt: "2026-11-02T00:00:00Z",
        lang: "ja",
        schemaVariant: "Article",
        translationKey: "abc",
        faqSchema: { "@type": "FAQPage", mainEntity: [] },
      },
      "a-post",
    );
    expect(fm).toMatchObject({ status: "published", lang: "ja", schemaVariant: "Article", translationKey: "abc" });
    expect(fm.faqSchema).toEqual({ "@type": "FAQPage", mainEntity: [] });
  });

  it.each(["title", "status", "publishAt", "author", "authorSlug"])("fails the build without %s", (key) => {
    const raw: Record<string, unknown> = { ...base };
    delete raw[key];
    expect(() => parseFrontmatter(raw, "a-post")).toThrow(key);
  });

  it("rejects an unknown status and an unparseable publishAt", () => {
    expect(() => parseFrontmatter({ ...base, status: "draft" }, "a-post")).toThrow(/status/);
    expect(() => parseFrontmatter({ ...base, publishAt: "soon" }, "a-post")).toThrow(/publishAt/);
  });

  it("requires alt text and a site-relative path for a cover image", () => {
    expect(() => parseFrontmatter({ ...base, coverImage: "/images/x.png" }, "a-post")).toThrow(/coverImageAlt/);
    expect(() =>
      parseFrontmatter({ ...base, coverImage: "javascript:alert(1)", coverImageAlt: "x" }, "a-post"),
    ).toThrow(/site-relative/);
  });

  it("accepts YAML dates (gray-matter turns unquoted timestamps into Date)", () => {
    const fm = parseFrontmatter({ ...base, publishAt: new Date("2026-11-01T09:00:00Z") }, "a-post");
    expect(fm.publishAt).toBe("2026-11-01T09:00:00.000Z");
  });

  it("rejects a file name that is not a slug", () => {
    expect(() => parseFrontmatter(base, "Bad Name")).toThrow(/file name/);
  });

  it("keeps only complete hand-authored FAQ entries", () => {
    const fm = parseFrontmatter(
      { ...base, faq: [{ question: "Q?", answer: "A." }, { question: "no answer" }, "junk"] },
      "a-post",
    );
    expect(fm.faq).toEqual([{ question: "Q?", answer: "A." }]);
  });
});

describe("visibility", () => {
  it("renders only published posts whose publishAt has passed", () => {
    expect(isServable({ status: "published", publishAt: "2026-11-05T11:59:59Z" }, NOW)).toBe(true);
    expect(isServable({ status: "published", publishAt: "2026-11-05T12:00:00Z" }, NOW)).toBe(true);
    expect(isServable({ status: "published", publishAt: "2026-11-05T12:00:01Z" }, NOW)).toBe(false);
    expect(isServable({ status: "scheduled", publishAt: "2026-01-01T00:00:00Z" }, NOW)).toBe(false);
  });

  it("fails closed on a missing or unknown status", () => {
    const fm = { status: undefined as unknown as "published", publishAt: "2026-01-01T00:00:00Z" };
    expect(isServable(fm, NOW)).toBe(false);
  });

  it("lists live posts newest first and drops future and scheduled ones", () => {
    const posts = [
      post("old", { publishAt: "2026-10-01T00:00:00Z" }),
      post("new", { publishAt: "2026-11-04T00:00:00Z" }),
      post("future", { publishAt: "2026-12-01T00:00:00Z" }),
      post("scheduled", { status: "scheduled", publishAt: "2026-10-15T00:00:00Z" }),
    ];
    expect(livePosts(posts, NOW).map((p) => p.slug)).toEqual(["new", "old"]);
  });

  it("paginates with clamping", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(paginate(items, 2, 3)).toEqual({ items: [4, 5, 6], page: 2, totalPages: 3 });
    expect(paginate(items, 9, 3).page).toBe(3);
    expect(paginate([], 1, 3)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});

describe("hreflangAlternates", () => {
  it("pairs live language versions sharing a translation key", () => {
    const en = post("guide", { translationKey: "k1", lang: "en" });
    const ja = post("guide-ja", { translationKey: "k1", lang: "ja" });
    const other = post("other");
    const alternates = hreflangAlternates(en, [en, ja, other], SITE);
    expect(alternates).toEqual([
      { hreflang: "en", href: "https://blog.example.com/posts/guide" },
      { hreflang: "ja", href: "https://blog.example.com/posts/guide-ja" },
    ]);
  });

  it("never advertises a sibling that is not live in this build", () => {
    const en = post("guide", { translationKey: "k1", lang: "en" });
    // The ja sibling exists in the repo but is scheduled → not in the live set.
    expect(hreflangAlternates(en, [en], SITE)).toEqual([]);
  });
});

describe("loader", () => {
  it("loads every .mdx file and keeps the HTML body verbatim", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-posts-"));
    fs.writeFileSync(
      path.join(dir, "hello-world.mdx"),
      `---\ntitle: "Hello"\nstatus: "published"\npublishAt: "2026-11-01T09:00:00Z"\nauthor: "Jane"\nauthorSlug: "jane"\n---\n<p>Hi {there}</p>\n`,
    );
    fs.writeFileSync(path.join(dir, "notes.txt"), "ignored");
    const posts = loadAllPosts(dir);
    expect(posts.map((p) => p.slug)).toEqual(["hello-world"]);
    expect(posts[0]!.html).toBe("<p>Hi {there}</p>");
  });

  it("parses JSON-encoded frontmatter values (the publisher's quoting)", () => {
    const source = [
      "---",
      `title: ${JSON.stringify('Quotes " and \\ and: colons')}`,
      `status: "scheduled"`,
      `publishAt: "2026-12-01T09:00:00Z"`,
      `author: "Jane"`,
      `authorSlug: "jane"`,
      `faqSchema: ${JSON.stringify({ "@type": "FAQPage", mainEntity: [{ name: "Q<?" }] })}`,
      "---",
      "<p>x</p>",
    ].join("\n");
    const parsed = parsePostSource("quoted", source);
    expect(parsed.frontmatter.title).toBe('Quotes " and \\ and: colons');
    expect(parsed.frontmatter.status).toBe("scheduled");
    expect(parsed.frontmatter.faqSchema).toEqual({ "@type": "FAQPage", mainEntity: [{ name: "Q<?" }] });
  });

  it("returns no posts for a missing directory", () => {
    expect(loadAllPosts(path.join(os.tmpdir(), "does-not-exist-blog-posts"))).toEqual([]);
  });
});
