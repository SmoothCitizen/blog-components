import { describe, expect, it } from "vitest";

import { resolveFont, FONT_PAIRS, themeCss } from "../src/theme/css";
import { parseTheme } from "../src/theme/schema";
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
