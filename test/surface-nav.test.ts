// v0.3.0 surfaces: page-surface colors, header nav links, logo sizing and the
// `bar` header variant. The load-bearing rule is byte-compat: a config that
// sets none of the new keys must produce the IDENTICAL themeCss + header markup
// it did at v0.2.0 (the fixtures in test/fixtures were captured from v0.2.0).

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveSurface, themeCss } from "../src/theme/css";
import { contrastRatio, hexToRgb, relativeLuminance, rgbToHsl, AA_CONTRAST } from "../src/theme/palette";
import { isSafeNavHref, parseTheme } from "../src/theme/schema";
import { SiteHeader, htmlAttributes } from "../src/components/chrome";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const read = (name: string) => readFileSync(join(fixtures, name), "utf8");

// A config as it would have been written for v0.2.0 (no surface/nav_links/
// logo_width, header/post among the v0.2.0 variants). Mirrors the config the
// fixtures were captured from.
const config020 = {
  brand_name: "Example Co",
  tagline: "Notes on building Example Co",
  accent_color: "#7a1f1f",
  palette: { kind: "preset", preset_id: "oxblood_cream", primary: "#7a1f1f", secondary: "#f3e9d2" },
  font_pair: "editorial",
  layout_variant: "journal",
  header_variant: "centered",
  post_variant: "wide",
  radius: "10px",
  space: "20px",
  class_prefix: "exr",
  logo_key: "images/logo.png",
  schema_variant: "BlogPosting",
};

const DARK = { bg: "#0f172a", ink: "#e2e8f0", muted: "#94a3b8", line: "#1e293b" };

describe("v0.2.0 byte-compatibility", () => {
  it("themeCss is byte-identical for a v0.2.0 config (full + plain)", () => {
    expect(themeCss(parseTheme(config020))).toBe(read("v0_2_0-themecss.txt"));
    expect(themeCss(parseTheme({ brand_name: "Plain", layout_variant: "journal" }))).toBe(
      read("v0_2_0-themecss-plain.txt"),
    );
  });

  it("SiteHeader markup is byte-identical for a v0.2.0 config (full + plain)", () => {
    const theme = parseTheme(config020);
    expect(renderToStaticMarkup(createElement(SiteHeader, { theme, classPrefix: "exr" }))).toBe(
      read("v0_2_0-header.txt"),
    );
    const plain = parseTheme({ brand_name: "Plain", layout_variant: "journal" });
    expect(renderToStaticMarkup(createElement(SiteHeader, { theme: plain }))).toBe(read("v0_2_0-header-plain.txt"));
  });

  it("a v0.2.0 config emits none of the v0.3.0 CSS markers", () => {
    const css = themeCss(parseTheme(config020));
    expect(css).not.toContain("color-scheme");
    expect(css).not.toContain('[data-header="bar"]');
    expect(css).not.toContain("nav-pill");
    expect(css).not.toMatch(/\.logo\{width:/);
  });
});

describe("surface parsing + AA fallback", () => {
  it("parses a valid surface and emits its colors as the page vars", () => {
    const theme = parseTheme({ brand_name: "X", surface: DARK });
    expect(theme.surface).toEqual(DARK);
    const css = themeCss(theme);
    expect(css).toContain("--bg:#0f172a;");
    expect(css).toContain("--ink:#e2e8f0;");
    expect(css).toContain("--muted:#94a3b8;");
    expect(css).toContain("--line:#1e293b;");
    // the former #333 literals (blockquote / excerpt soft-ink) are now surface-derived
    expect(css).not.toContain("color:#333");
  });

  it("drops the whole surface (light defaults) when ink fails AA on bg", () => {
    // light-grey ink on near-black bg: ~2:1, well below AA
    const bad = { bg: "#111111", ink: "#555555", muted: "#777777", line: "#333333" };
    expect(contrastRatio("#555555", "#111111")).toBeLessThan(AA_CONTRAST);
    const css = themeCss(parseTheme({ brand_name: "X", surface: bad }));
    expect(css).toContain("--bg:#ffffff;");
    expect(css).toContain("--ink:#1a1a1a;");
    expect(css).toContain("color:#333"); // back to the literal default
    expect(css).not.toContain("color-scheme");
  });

  it("drops the surface when any hex is invalid", () => {
    const css = themeCss(parseTheme({ brand_name: "X", surface: { ...DARK, line: "navy" } }));
    expect(css).toContain("--bg:#ffffff;");
  });

  it("parseSurface returns null unless all four colors are present", () => {
    expect(parseTheme({ brand_name: "X", surface: { bg: "#111111", ink: "#eeeeee" } }).surface).toBeNull();
    expect(parseTheme({ brand_name: "X", surface: "nope" as unknown }).surface).toBeNull();
  });

  it("adds color-scheme:dark on :root for a low-luminance bg, not for a light one", () => {
    expect(relativeLuminance("#0f172a")).toBeLessThan(0.2);
    expect(themeCss(parseTheme({ brand_name: "X", surface: DARK }))).toContain("color-scheme:dark;");
    const lightSurface = { bg: "#fafafa", ink: "#111111", muted: "#555555", line: "#dddddd" };
    expect(themeCss(parseTheme({ brand_name: "X", surface: lightSurface }))).not.toContain("color-scheme");
  });

  it("resolveSurface derives a dark panel + dim soft-ink from a dark bg", () => {
    const s = resolveSurface(DARK);
    expect(relativeLuminance(s.panel)).toBeLessThan(0.2); // dark panel, not pale
    expect(s.dark).toBe(true);
  });
});

describe("accent guard uses the surface bg", () => {
  it("keeps the accent AA-readable against a dark surface and tints toward it", () => {
    const css = themeCss(parseTheme({ brand_name: "X", surface: DARK, palette: { primary: "#1f2a44", secondary: null } }));
    const accent = /--accent:(#[0-9a-f]{6});/.exec(css)?.[1] ?? "";
    const tint = /--accent-tint:(#[0-9a-f]{6});/.exec(css)?.[1] ?? "";
    // AA against the DARK bg, not white
    expect(contrastRatio(accent, DARK.bg)).toBeGreaterThanOrEqual(AA_CONTRAST);
    // a dark navy brand accent would be unreadable on dark bg — the guard lightens it
    expect(rgbToHsl(hexToRgb(accent)).l).toBeGreaterThan(rgbToHsl(hexToRgb("#1f2a44")).l);
    // the tint mixes 10% accent into the DARK bg → a dark tint, not a pale one
    expect(relativeLuminance(tint)).toBeLessThan(0.2);
  });
});

describe("nav_links validation", () => {
  it("rejects javascript:/data:/http:/protocol-relative hrefs, keeps / and https", () => {
    expect(isSafeNavHref("/pricing")).toBe(true);
    expect(isSafeNavHref("https://blog.example.com/docs")).toBe(true);
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,x",
      "http://blog.example.com",
      "//evil.example.com",
      "mailto:a@example.com",
      "#top",
      "https://",
    ]) {
      expect(isSafeNavHref(bad), bad).toBe(false);
    }
  });

  it("drops links with a javascript: href", () => {
    const theme = parseTheme({
      brand_name: "X",
      nav_links: [
        { label: "Safe", href: "/safe" },
        { label: "Evil", href: "javascript:alert(1)" },
      ],
    });
    expect(theme.nav_links.map((l) => l.href)).toEqual(["/safe"]);
  });

  it("caps the list at 6 links", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ label: `L${i}`, href: `/p${i}` }));
    expect(parseTheme({ brand_name: "X", nav_links: many }).nav_links).toHaveLength(6);
  });

  it("drops a label longer than 30 chars and keeps a 30-char label", () => {
    const theme = parseTheme({
      brand_name: "X",
      nav_links: [
        { label: "x".repeat(31), href: "/too-long" },
        { label: "y".repeat(30), href: "/ok" },
      ],
    });
    expect(theme.nav_links.map((l) => l.href)).toEqual(["/ok"]);
  });

  it("keeps a pill style and normalizes any other style to null", () => {
    const theme = parseTheme({
      brand_name: "X",
      nav_links: [
        { label: "A", href: "/a", style: "pill" },
        { label: "B", href: "/b", style: "button" },
      ],
    });
    expect(theme.nav_links[0]?.style).toBe("pill");
    expect(theme.nav_links[1]?.style).toBeNull();
  });

  it("defaults to [] when absent or not an array", () => {
    expect(parseTheme({ brand_name: "X" }).nav_links).toEqual([]);
    expect(parseTheme({ brand_name: "X", nav_links: "no" as unknown }).nav_links).toEqual([]);
  });
});

describe("nav_links + pill rendering", () => {
  const theme = parseTheme({
    brand_name: "Example Co",
    nav_links: [
      { label: "Pricing", href: "/pricing", style: "pill" },
      { label: "Docs", href: "https://docs.example.com", style: "pill" },
    ],
  });

  it("replaces the default nav with the custom links and marks pills", () => {
    const html = renderToStaticMarkup(createElement(SiteHeader, { theme }));
    expect(html).not.toContain(">Home<");
    expect(html).not.toContain(">Authors<");
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('class="nav-pill"');
    expect(html).toContain(">Pricing<");
  });

  it("adds rel=noopener only to external https links", () => {
    const html = renderToStaticMarkup(createElement(SiteHeader, { theme }));
    // external https link carries rel="noopener"
    expect(html).toMatch(/href="https:\/\/docs\.example\.com"[^>]*rel="noopener"/);
    // internal link carries no rel
    expect(html).not.toMatch(/href="\/pricing"[^>]*rel=/);
  });

  it("emits the pill CSS only when a pill link exists", () => {
    expect(themeCss(theme)).toContain(".nav-pill{border:1px solid currentColor;border-radius:30px;padding:6px 17px}");
    const noPill = parseTheme({ brand_name: "X", nav_links: [{ label: "Docs", href: "/docs" }] });
    expect(themeCss(noPill)).not.toContain("nav-pill");
  });
});

describe("logo_width bounds + rendering", () => {
  it("accepts an integer in [60,320] and rejects out-of-range / non-integers", () => {
    expect(parseTheme({ brand_name: "X", logo_width: 60 }).logo_width).toBe(60);
    expect(parseTheme({ brand_name: "X", logo_width: 320 }).logo_width).toBe(320);
    expect(parseTheme({ brand_name: "X", logo_width: "120" }).logo_width).toBe(120);
    for (const bad of [59, 321, 0, 120.5, -10, "wide"]) {
      expect(parseTheme({ brand_name: "X", logo_width: bad as unknown }).logo_width, String(bad)).toBeNull();
    }
  });

  it("emits a width rule and drops the intrinsic height attribute when set", () => {
    const theme = parseTheme({ brand_name: "X", logo_key: "images/logo.png", logo_width: 160 });
    expect(themeCss(theme)).toContain(".site-header .logo{width:160px;height:auto}");
    const html = renderToStaticMarkup(createElement(SiteHeader, { theme }));
    expect(html).toContain('src="/images/logo.png"');
    expect(html).not.toContain('height="40"');
  });

  it("keeps the default 40px logo height when unset", () => {
    const theme = parseTheme({ brand_name: "X", logo_key: "images/logo.png" });
    expect(themeCss(theme)).not.toMatch(/\.logo\{width:/);
    expect(renderToStaticMarkup(createElement(SiteHeader, { theme }))).toContain('height="40"');
  });
});

describe("bar header variant", () => {
  const theme = parseTheme({ brand_name: "X", header_variant: "bar", surface: DARK, logo_key: "images/logo.png", logo_width: 180 });

  it("is a recognized header variant", () => {
    expect(theme.header_variant).toBe("bar");
    expect((htmlAttributes({ language: "en" }, theme) as Record<string, string>)["data-header"]).toBe("bar");
  });

  it("emits the full-bleed bar rules (surface bg, 5% padding, 32px nav gap, hover underline)", () => {
    const css = themeCss(theme);
    expect(css).toContain('[data-header="bar"] .site-header{background:var(--bg);border-bottom:1px solid var(--line);padding:21px 5%}');
    expect(css).toContain('[data-header="bar"] .site-header .wrap{max-width:none');
    expect(css).toContain('[data-header="bar"] .site-nav{margin-top:0;gap:32px;font-size:15px;align-items:center;flex-wrap:wrap}');
    // v0.6.1: the row wraps on a phone (nav under the logo, no sideways scroll)
    expect(css).toContain('[data-header="bar"] .site-header .wrap{max-width:none;margin:0;padding:0;display:flex;flex-wrap:wrap;');
    expect(css).toContain('[data-header="bar"] .site-nav a{color:var(--ink);text-decoration:none;display:flex;align-items:center;min-height:44px}');
    expect(css).toContain("text-underline-offset:6px");
    expect(css).toContain("@media (max-width:800px){[data-header=\"bar\"] .site-header{padding:22px 6%}");
    // logo shrink at <=560px, present because logo_width is set
    expect(css).toContain("@media (max-width:560px){[data-header=\"bar\"] .site-header .logo{width:138px}}");
  });

  it("does not emit the bar block for a non-bar header", () => {
    expect(themeCss(parseTheme({ brand_name: "X", header_variant: "classic" }))).not.toContain('[data-header="bar"]');
  });

  it("omits the <=560px logo shrink when no logo_width is set", () => {
    const noWidth = parseTheme({ brand_name: "X", header_variant: "bar" });
    expect(themeCss(noWidth)).not.toContain("width:138px");
  });

  it("prefixes the bar + pill selectors with the class prefix", () => {
    const prefixed = parseTheme({
      brand_name: "X",
      header_variant: "bar",
      class_prefix: "exr",
      nav_links: [{ label: "A", href: "/a", style: "pill" }],
    });
    const css = themeCss(prefixed);
    expect(css).toContain('[data-header="bar"] .exr-site-header');
    expect(css).toContain(".exr-site-nav .exr-nav-pill");
  });
});
