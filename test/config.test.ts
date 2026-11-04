import { describe, expect, it } from "vitest";

import { resolveFont, FONT_PAIRS, themeCss } from "../src/theme/css";
import { parseTheme } from "../src/theme/schema";
import { classer, prefixStylesheet } from "../src/theme/classes";
import { parseSiteConfig } from "../src/site/schema";

const SITE = {
  site_name: "Example Blog",
  canonical_hostname: "blog.example.com",
  language: "en",
  authors: [{ slug: "jane-doe", name: "Jane Doe" }],
};

describe("parseTheme", () => {
  it("normalizes the API's stored theme shape", () => {
    const theme = parseTheme({
      brand_name: "Example Co",
      accent_color: "#7A1F1F",
      palette: { kind: "preset", preset_id: "slate_amber", primary: "#334155", secondary: "#f59e0b" },
      font_pair: "editorial_serif",
      layout_variant: "grid",
      schema_variant: "Article",
    });
    expect(theme).toMatchObject({ brand_name: "Example Co", layout_variant: "grid", schema_variant: "Article" });
    expect(theme.palette).toEqual({ kind: "preset", preset_id: "slate_amber", primary: "#334155", secondary: "#f59e0b" });
  });

  it("falls back to defaults for unknown cosmetic enums", () => {
    const theme = parseTheme({ brand_name: "X", layout_variant: "carousel", schema_variant: "Review" });
    expect(theme.layout_variant).toBe("journal");
    expect(theme.schema_variant).toBe("BlogPosting");
    expect(theme.font_pair).toBe("editorial");
    expect(theme.palette).toBeNull();
  });

  it("requires a brand name", () => {
    expect(() => parseTheme({ accent_color: "#000000" })).toThrow(/brand_name/);
  });
});

describe("parseTheme — per-site design knobs", () => {
  it("defaults the new fields byte-compatibly when absent", () => {
    const theme = parseTheme({ brand_name: "X" });
    expect(theme).toMatchObject({
      header_variant: "classic",
      post_variant: "classic",
      radius: "8px",
      space: "18px",
      class_prefix: "",
      fonts: { heading: null, body: null },
    });
  });

  it("reads custom fonts, radius/space, header/post variants, and a sanitized class prefix", () => {
    const theme = parseTheme({
      brand_name: "X",
      fonts: { heading: "Inter, sans-serif", body: "Lora, serif" },
      radius: "0",
      space: "24px",
      header_variant: "centered",
      post_variant: "wide",
      class_prefix: "Site A!!",
    });
    expect(theme.fonts).toEqual({ heading: "Inter, sans-serif", body: "Lora, serif" });
    expect(theme).toMatchObject({ radius: "0", space: "24px", header_variant: "centered", post_variant: "wide" });
    expect(theme.class_prefix).toBe("sitea"); // lowercased, non-[a-z0-9-] stripped
  });

  it("falls back to defaults for unknown header/post variants and a prefix that is not class-safe", () => {
    const theme = parseTheme({ brand_name: "X", header_variant: "hero", post_variant: "fancy", class_prefix: "9lives" });
    expect(theme.header_variant).toBe("classic");
    expect(theme.post_variant).toBe("classic");
    expect(theme.class_prefix).toBe(""); // must start with a letter
  });
});

describe("class prefixing", () => {
  it("prefixes class tokens and the matching stylesheet identically", () => {
    const c = classer("acme");
    expect(c("post-body")).toBe("acme-post-body");
    expect(c("a", "b")).toBe("acme-a acme-b");
    expect(classer("")("post-body")).toBe("post-body"); // empty = no prefix

    const css = ".post-body h2{margin:0} .btn:hover{color:#fff} [data-layout=\"grid\"] .excerpt{}";
    const out = prefixStylesheet(css, "acme");
    expect(out).toContain(".acme-post-body h2");
    expect(out).toContain(".acme-btn:hover");
    expect(out).toContain(".acme-excerpt");
    // attribute selectors, hex colors and numeric fragments are untouched
    expect(out).toContain('[data-layout="grid"]');
    expect(out).toContain("#fff");
    expect(prefixStylesheet(css, "")).toBe(css); // empty = no-op
  });

  it("themeCss emits prefixed selectors + the layout variant blocks", () => {
    const css = themeCss(parseTheme({ brand_name: "X", class_prefix: "acme", radius: "4px" }));
    expect(css).toContain(".acme-post-body");
    expect(css).toContain(".acme-site-header");
    expect(css).toContain("--radius:4px");
    expect(css).toContain('[data-header="centered"]');
    expect(css).toContain('[data-post="wide"]');
  });
});

describe("themeCss", () => {
  it("never emits a customer value verbatim into CSS", () => {
    const css = themeCss({
      accent_color: "red;}body{visibility:hidden",
      palette: { primary: "</style><script>", secondary: null },
      font_pair: "modern",
    });
    expect(css).not.toContain("visibility:hidden");
    expect(css).not.toContain("<script>");
    expect(css).toMatch(/--accent:#[0-9a-f]{6};/);
  });

  it("maps the API's editorial_serif default to the editorial stack", () => {
    expect(resolveFont("editorial_serif")).toEqual(FONT_PAIRS.editorial);
    expect(resolveFont("unknown")).toEqual(FONT_PAIRS.editorial);
  });
});

describe("parseSiteConfig", () => {
  it("accepts a valid site file", () => {
    expect(parseSiteConfig(SITE)).toMatchObject({ canonical_hostname: "blog.example.com", description: null });
  });

  it.each(["https://blog.example.com", "blog.example.com/path", "localhost", "blog.example.com:8080"])(
    "rejects canonical_hostname %s",
    (hostname) => {
      expect(() => parseSiteConfig({ ...SITE, canonical_hostname: hostname })).toThrow(/canonical_hostname/);
    },
  );

  it("requires at least one author with a slug-shaped slug, and no duplicates", () => {
    expect(() => parseSiteConfig({ ...SITE, authors: [] })).toThrow(/at least one author/);
    expect(() => parseSiteConfig({ ...SITE, authors: [{ slug: "Jane Doe", name: "J" }] })).toThrow(/slug/);
    expect(() =>
      parseSiteConfig({ ...SITE, authors: [{ slug: "a", name: "A" }, { slug: "a", name: "B" }] }),
    ).toThrow(/duplicate/);
  });

  it("rejects a non-BCP-47 language", () => {
    expect(() => parseSiteConfig({ ...SITE, language: "English" })).toThrow(/language/);
  });
});
