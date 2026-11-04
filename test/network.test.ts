import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "../src/content/frontmatter";
import { parseMarkdownBlocks, resolveBodyFormat } from "../src/content/markdown";
import { PostArticle, PostBody } from "../src/components/posts";
import { PaidPlacementCallout, showPaidPlacement, showSponsorBanner } from "../src/components/disclosure";
import { parseSiteConfig } from "../src/site/schema";
import {
  aboutPageMarkdown,
  buildEditorialPlaceholders,
  disclosurePageMarkdown,
  substitutePlaceholders,
} from "../src/content/editorial-pages";
import { postJsonLd } from "../src/seo/jsonld";
import { parseTheme } from "../src/theme/schema";
import type { Post } from "../src/content/types";
import type { SiteConfig, SponsorConfig } from "../src/site/schema";

const base = {
  title: "A post",
  status: "published",
  publishAt: "2026-11-01T09:00:00Z",
  author: "Jane Doe",
  authorSlug: "jane-doe",
};

const post = (overrides: Record<string, unknown>, html: string): Post => ({
  slug: "a-post",
  frontmatter: parseFrontmatter({ ...base, ...overrides }, "a-post"),
  html,
});

const SPONSOR: SponsorConfig = {
  publisherEntity: "Example Publisher, Inc.",
  attributionUrl: "https://publisher.example.com",
  attributionText: "Built by Example Publisher",
  niche: "CRM software",
  contactEmail: "editorial@blog.example.com",
  disclosurePath: "/disclosure",
  aboutPath: "/about",
};

const sponsorSite = (sponsor: SponsorConfig | null): SiteConfig => ({
  site_name: "Example Blog",
  canonical_hostname: "blog.example.com",
  language: "en",
  description: null,
  authors: [{ slug: "jane-doe", name: "Jane Doe", title: "Editor", bio: "Bio.", expertise: ["CRM software"] }],
  features: { sponsorDisclosure: sponsor !== null },
  sponsor,
});

const THEME = parseTheme({ brand_name: "Example Blog" });

describe("body rendering", () => {
  it("renders an HTML body as HTML, not escaped text (fixes the literal-HTML bug)", () => {
    // No bodyFormat key → auto-detected as HTML from the leading <article> tag.
    const p = post({}, '<article><h2>Hi</h2><section class="key-takeaways"><p>K</p></section></article>');
    expect(p.frontmatter.bodyFormat).toBeNull();
    const html = renderToStaticMarkup(createElement(PostBody, { post: p }));
    // The real tags appear in the output; they are NOT escaped to &lt;article&gt;.
    expect(html).toContain('<article><h2>Hi</h2><section class="key-takeaways">');
    expect(html).not.toContain("&lt;article&gt;");
  });

  it("renders a markdown body as real elements when bodyFormat is markdown", () => {
    const p = post({ bodyFormat: "markdown" }, "## A heading\n\nA paragraph with [a link](/x).\n\n- one\n- two");
    expect(p.frontmatter.bodyFormat).toBe("markdown");
    const html = renderToStaticMarkup(createElement(PostBody, { post: p }));
    expect(html).toContain("<h2>A heading</h2>");
    expect(html).toContain('<a href="/x">a link</a>');
    expect(html).toContain("<li>one</li>");
    // The markdown source is turned into DOM, not shown verbatim.
    expect(html).not.toContain("## A heading");
  });

  it("auto-renders a markdown body as markdown when no bodyFormat is set", () => {
    const p = post({}, "## Heading\n\nPlain prose.");
    expect(p.frontmatter.bodyFormat).toBeNull();
    const html = renderToStaticMarkup(createElement(PostBody, { post: p }));
    expect(html).toContain("<h2>Heading</h2>");
    expect(html).not.toContain("## Heading");
  });

  it("leaves bodyFormat null for an absent or unknown value (auto-detect)", () => {
    expect(parseFrontmatter({ ...base, bodyFormat: "mdx" }, "a-post").bodyFormat).toBeNull();
    expect(parseFrontmatter({ ...base }, "a-post").bodyFormat).toBeNull();
    expect(parseFrontmatter({ ...base, bodyFormat: "markdown" }, "a-post").bodyFormat).toBe("markdown");
  });

  it("resolveBodyFormat detects HTML vs markdown and lets an explicit value win", () => {
    // leading block tags → html
    for (const body of ["<article>x", "  <section>x", "<p>x", "<h1>x", "<div>x", "<ul><li>x", "<table>"]) {
      expect(resolveBodyFormat(null, body)).toBe("html");
    }
    // markdown, incl. markdown that merely CONTAINS inline HTML (does not start with a block tag)
    expect(resolveBodyFormat(null, "## Heading")).toBe("markdown");
    expect(resolveBodyFormat(null, "Plain text with <strong>inline</strong> html.")).toBe("markdown");
    expect(resolveBodyFormat(null, "- a list")).toBe("markdown");
    // explicit wins over detection
    expect(resolveBodyFormat("markdown", "<article>x")).toBe("markdown");
    expect(resolveBodyFormat("html", "## not actually markdown")).toBe("html");
  });

  it("parseMarkdownBlocks produces the expected block structure", () => {
    const blocks = parseMarkdownBlocks('# Title\n\nPara.\n\n- a\n- b\n\n![alt](/img.png "cap")');
    expect(blocks).toEqual([
      { type: "heading", level: 1, text: "Title" },
      { type: "paragraph", text: "Para." },
      { type: "list", items: ["a", "b"] },
      { type: "image", alt: "alt", src: "/img.png", caption: "cap" },
    ]);
  });
});

describe("sponsor-disclosure gating", () => {
  it("shows the banner only when the feature is on and a sponsor is configured", () => {
    expect(showSponsorBanner(sponsorSite(null))).toBe(false);
    expect(showSponsorBanner(sponsorSite(SPONSOR))).toBe(true);
  });

  it("shows the per-post callout only when the mode is on AND the post carries paid brands", () => {
    const paid = { paidBrands: ["AcmeCRM"] };
    const unpaid = { paidBrands: [] as string[] };
    // mode off → never, even with paid brands
    expect(showPaidPlacement(sponsorSite(null), parseFrontmatter({ ...base, ...paid }, "a-post"))).toBe(false);
    // mode on but no paid brands → no callout
    expect(showPaidPlacement(sponsorSite(SPONSOR), parseFrontmatter({ ...base, ...unpaid }, "a-post"))).toBe(false);
    // mode on + paid brands → callout
    expect(showPaidPlacement(sponsorSite(SPONSOR), parseFrontmatter({ ...base, ...paid }, "a-post"))).toBe(true);
  });

  it("PaidPlacementCallout renders nothing for an empty paid-brand list", () => {
    const empty = renderToStaticMarkup(
      createElement(PaidPlacementCallout, { paidBrands: [], disclosurePath: "/disclosure" }),
    );
    expect(empty).toBe("");
    const shown = renderToStaticMarkup(
      createElement(PaidPlacementCallout, {
        paidBrands: ["AcmeCRM"],
        otherBrands: ["PipeCRM"],
        disclosurePath: "/disclosure",
      }),
    );
    expect(shown).toContain("AcmeCRM");
    expect(shown).toContain("PipeCRM");
  });

  it("PostArticle renders the callout only when the site enables disclosure and the post is paid", () => {
    const paidPost = post({ paidBrands: ["AcmeCRM"], otherBrands: ["PipeCRM"] }, "<p>x</p>");
    const withMode = renderToStaticMarkup(createElement(PostArticle, { post: paidPost, site: sponsorSite(SPONSOR) }));
    expect(withMode).toContain("Paid partnership disclosure");
    expect(withMode).toContain("AcmeCRM");

    const withoutMode = renderToStaticMarkup(createElement(PostArticle, { post: paidPost, site: sponsorSite(null) }));
    expect(withoutMode).not.toContain("Paid partnership disclosure");
  });
});

describe("parseSiteConfig — features + sponsor + expertise", () => {
  const raw = {
    site_name: "Example Blog",
    canonical_hostname: "blog.example.com",
    language: "en",
    authors: [{ slug: "jane-doe", name: "Jane Doe", expertise: ["CRM", "Sales ops", 7] }],
  };

  it("defaults the feature off and the sponsor to null", () => {
    const site = parseSiteConfig(raw);
    expect(site.features.sponsorDisclosure).toBe(false);
    expect(site.sponsor).toBeNull();
    expect(site.authors[0]!.expertise).toEqual(["CRM", "Sales ops"]);
  });

  it("parses the sponsor block when the feature is on", () => {
    const site = parseSiteConfig({
      ...raw,
      features: { sponsorDisclosure: true },
      sponsor: { publisherEntity: "Example Publisher, Inc.", attributionUrl: "https://publisher.example.com" },
    });
    expect(site.sponsor).toMatchObject({
      publisherEntity: "Example Publisher, Inc.",
      attributionUrl: "https://publisher.example.com",
      disclosurePath: "/disclosure",
      aboutPath: "/about",
    });
  });

  it("fails the build when disclosure is on but the publisher/attribution is missing or malformed", () => {
    expect(() => parseSiteConfig({ ...raw, features: { sponsorDisclosure: true }, sponsor: {} })).toThrow(
      /attributionUrl/,
    );
    expect(() =>
      parseSiteConfig({
        ...raw,
        features: { sponsorDisclosure: true },
        sponsor: { attributionUrl: "not-a-url", publisherEntity: "X" },
      }),
    ).toThrow(/absolute http/);
  });
});

describe("editorial pages", () => {
  it("substitutes every token and omits the contact section when no email is set", () => {
    const values = buildEditorialPlaceholders("Example Blog", { ...SPONSOR, contactEmail: null });
    const md = disclosurePageMarkdown(values);
    expect(md).toContain("Example Blog is published by Example Publisher, Inc.");
    expect(md).not.toContain("{site_name}");
    expect(md).not.toContain("## Contact");
  });

  it("includes the contact section when an email is set", () => {
    const md = aboutPageMarkdown(buildEditorialPlaceholders("Example Blog", SPONSOR));
    expect(md).toContain("## Contact");
    expect(md).toContain("editorial@blog.example.com");
  });

  it("throws when a required placeholder is empty", () => {
    expect(() =>
      substitutePlaceholders("{publisher_entity}", {
        site_name: "x",
        site_niche: "x",
        contact_email: "",
        publisher_entity: "",
        publisher_url: "https://x.example.com",
      }),
    ).toThrow(/publisher_entity/);
  });
});

describe("Review JSON-LD + sponsor publisher", () => {
  it("emits a Review node with the sponsor as publisher when schemaVariant is Review", () => {
    const site = sponsorSite(SPONSOR);
    const reviewPost = post({ schemaVariant: "Review", paidBrands: ["AcmeCRM"] }, "<p>x</p>");
    const blocks = postJsonLd(reviewPost, site, THEME, site.authors[0]);
    expect(blocks[0]).toMatchObject({
      "@type": "Review",
      itemReviewed: { "@type": "SoftwareApplication", name: "AcmeCRM" },
      publisher: { "@type": "Organization", name: "Example Publisher, Inc." },
    });
    // the author node carries knowsAbout (expertise) + worksFor (publisher)
    expect(blocks[1]).toMatchObject({
      "@type": "Person",
      knowsAbout: ["CRM software"],
      worksFor: { name: "Example Publisher, Inc." },
    });
  });
});
