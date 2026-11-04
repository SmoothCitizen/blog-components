// Palette derivation + WCAG contrast guard. Pure-function tests (kept identical
// to the hosted renderer's, so both surfaces derive the same tokens):
// every fixture — however unreadable as input — must come out AA-safe, and the
// resolution order (palette.primary → legacy accent_color → default slate) and
// secondary emit/omit rules must hold exactly.

import { describe, expect, it } from "vitest";
import {
  AA_CONTRAST,
  DEFAULT_ACCENT,
  PAGE_BG,
  contrastRatio,
  derivePalette,
  guardAccent,
  hexToRgb,
  hslToRgb,
  inkFor,
  mix,
  normalizeHex,
  paletteCssVars,
  relativeLuminance,
  resolveBaseAccent,
  rgbToHex,
  rgbToHsl,
} from "../src/theme/palette";

const HEX6 = /^#[0-9a-f]{6}$/;

// Derivation fixtures + the two boundary cases.
const FIXTURES: Record<string, string> = {
  "brand yellow": "#ffd400",
  "near-white": "#f7f7f7",
  "near-black": "#0a0a0a",
  oxblood: "#6b1f2a",
  "default slate": DEFAULT_ACCENT,
  "short-form #rgb": "#fd0",
  "pure white": "#ffffff",
  "pure black": "#000000",
};

describe("normalizeHex — strict validation", () => {
  it("accepts #rrggbb (any case) and lowercases it", () => {
    expect(normalizeHex("#FFD400")).toBe("#ffd400");
    expect(normalizeHex("  #ffd400 ")).toBe("#ffd400");
  });

  it("expands #rgb to #rrggbb", () => {
    expect(normalizeHex("#fd0")).toBe("#ffdd00");
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
  });

  it("rejects everything else (keywords, rgb(), 8-digit alpha, garbage, non-strings)", () => {
    for (const bad of [
      "darkslategray",
      "rgb(10, 20, 30)",
      "hsl(200 50% 50%)",
      "#ffd40080",
      "#ffd4",
      "ffd400",
      "#ggg",
      "#ffd400; } body { display:none",
      "",
      "   ",
      null,
      undefined,
      42,
      {},
    ]) {
      expect(normalizeHex(bad), String(bad)).toBeNull();
    }
  });
});

describe("color math", () => {
  it("sRGB ⇄ HSL round-trips every fixture within rounding", () => {
    for (const [name, hex] of Object.entries(FIXTURES)) {
      const rgb = hexToRgb(hex);
      const back = hexToRgb(rgbToHex(hslToRgb(rgbToHsl(rgb))));
      expect(Math.abs(back.r - rgb.r), `${name} r`).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - rgb.g), `${name} g`).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - rgb.b), `${name} b`).toBeLessThanOrEqual(1);
    }
  });

  it("relative luminance: white = 1, black = 0", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
  });

  it("contrast ratio: black/white = 21, symmetric, same color = 1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 6);
    expect(contrastRatio("#ffd400", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#ffd400"), 9);
    expect(contrastRatio("#6b1f2a", "#6b1f2a")).toBeCloseTo(1, 9);
  });

  it("mix: weight 0 ⇒ b, weight 1 ⇒ a, 0.5 ⇒ midpoint", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 1)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("contrast guard", () => {
  it.each(Object.entries(FIXTURES))("%s: --accent vs page bg ≥ 4.5:1 and --accent-ink vs --accent ≥ 4.5:1", (_name, hex) => {
    const p = derivePalette({ accent_color: "", palette: { primary: hex, secondary: null } });
    expect(p.accent).toMatch(HEX6);
    expect(contrastRatio(p.accent, PAGE_BG)).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(contrastRatio(p.accentInk, p.accent)).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(["#000000", "#ffffff"]).toContain(p.accentInk);
  });

  it("leaves an already-readable accent untouched", () => {
    expect(guardAccent("#6b1f2a")).toBe("#6b1f2a"); // oxblood ≈ 10:1 on white
    expect(guardAccent(DEFAULT_ACCENT)).toBe(DEFAULT_ACCENT);
    expect(guardAccent("#b5471f")).toBe("#b5471f"); // fixture site A
  });

  it("brand yellow comes out as a darkened yellow — same hue, never raw", () => {
    const guarded = guardAccent("#ffd400");
    expect(guarded).not.toBe("#ffd400");
    const before = rgbToHsl(hexToRgb("#ffd400"));
    const after = rgbToHsl(hexToRgb(guarded));
    expect(Math.abs(after.h - before.h)).toBeLessThan(3); // hue preserved
    expect(after.l).toBeLessThan(before.l); // darkened, not lightened
    expect(after.s).toBeGreaterThan(0.9); // still saturated yellow, not grey
    expect(contrastRatio(guarded, PAGE_BG)).toBeGreaterThanOrEqual(AA_CONTRAST);
  });

  it("near-white is darkened (not lightened) against a white page", () => {
    const guarded = guardAccent("#f7f7f7");
    expect(rgbToHsl(hexToRgb(guarded)).l).toBeLessThan(rgbToHsl(hexToRgb("#f7f7f7")).l);
  });

  it("guards in the other direction against a dark surface", () => {
    const guarded = guardAccent("#0a0a0a", "#111111");
    expect(rgbToHsl(hexToRgb(guarded)).l).toBeGreaterThan(rgbToHsl(hexToRgb("#0a0a0a")).l);
    expect(contrastRatio(guarded, "#111111")).toBeGreaterThanOrEqual(AA_CONTRAST);
  });

  it("an invalid input to the guard falls to the default slate", () => {
    expect(guardAccent("darkslategray")).toBe(DEFAULT_ACCENT);
  });

  it("inkFor picks the higher-contrast ink", () => {
    expect(inkFor("#000000")).toBe("#ffffff");
    expect(inkFor("#ffffff")).toBe("#000000");
    expect(inkFor("#6b1f2a")).toBe("#ffffff");
  });
});

describe("resolution order", () => {
  it("palette.primary wins over legacy accent_color", () => {
    expect(
      resolveBaseAccent({ accent_color: "#0a7d5a", palette: { primary: "#6b1f2a", secondary: null } }),
    ).toBe("#6b1f2a");
  });

  it("falls back to legacy accent_color when palette is absent", () => {
    expect(resolveBaseAccent({ accent_color: "#0a7d5a" })).toBe("#0a7d5a");
    expect(derivePalette({ accent_color: "#0a7d5a" }).accent).toBe("#0a7d5a");
  });

  it("falls back to legacy accent_color when palette.primary is invalid", () => {
    expect(
      resolveBaseAccent({ accent_color: "#0a7d5a", palette: { primary: "not-a-color", secondary: null } }),
    ).toBe("#0a7d5a");
  });

  it("falls back to the default slate when neither is a valid hex", () => {
    expect(resolveBaseAccent({ accent_color: "darkslategray" })).toBe(DEFAULT_ACCENT);
    expect(resolveBaseAccent({ accent_color: "rgb(1,2,3)", palette: { primary: "", secondary: null } })).toBe(
      DEFAULT_ACCENT,
    );
  });

  it("accepts a #rgb short form as the primary", () => {
    expect(resolveBaseAccent({ accent_color: "", palette: { primary: "#fd0", secondary: null } })).toBe(
      "#ffdd00",
    );
  });
});

describe("secondary tokens", () => {
  it("are emitted, guarded, when palette.secondary is a valid hex", () => {
    const p = derivePalette({ accent_color: "", palette: { primary: "#6b1f2a", secondary: "#ffd400" } });
    expect(p.secondary).toMatch(HEX6);
    expect(p.secondaryInk).toMatch(HEX6);
    expect(p.secondaryTint).toMatch(HEX6);
    expect(contrastRatio(p.secondary!, PAGE_BG)).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(contrastRatio(p.secondaryInk!, p.secondary!)).toBeGreaterThanOrEqual(AA_CONTRAST);
    const css = paletteCssVars({ accent_color: "", palette: { primary: "#6b1f2a", secondary: "#ffd400" } });
    expect(css).toContain("--secondary:");
    expect(css).toContain("--secondary-ink:");
    expect(css).toContain("--secondary-tint:");
  });

  it.each([
    ["null secondary", { primary: "#6b1f2a", secondary: null }],
    ["invalid secondary", { primary: "#6b1f2a", secondary: "teal" }],
    ["empty secondary", { primary: "#6b1f2a", secondary: "" }],
  ])("are NOT emitted for %s", (_name, palette) => {
    const p = derivePalette({ accent_color: "", palette });
    expect(p.secondary).toBeNull();
    expect(p.secondaryInk).toBeNull();
    expect(p.secondaryTint).toBeNull();
    expect(paletteCssVars({ accent_color: "", palette })).not.toContain("--secondary");
  });

  it("are NOT emitted on the legacy accent_color path", () => {
    expect(paletteCssVars({ accent_color: "#0a7d5a" })).not.toContain("--secondary");
  });
});

describe("emitted variable block", () => {
  it("every value is a bare #rrggbb — nothing customer-supplied reaches the stylesheet verbatim", () => {
    const css = paletteCssVars({
      accent_color: "#ffd400; } body { display:none",
      palette: { primary: "#ffd400", secondary: "#0a7d5a" },
    });
    for (const line of css.split("\n")) {
      expect(line).toMatch(/^ {2}--[a-z-]+:#[0-9a-f]{6};$/);
    }
  });

  it("snapshot: brand yellow primary + green secondary", () => {
    const css = paletteCssVars({ accent_color: "#0a7d5a", palette: { primary: "#ffd400", secondary: "#0a7d5a" } });
    expect(css).toMatchInlineSnapshot(`
      "  --accent:#876e00;
        --accent-ink:#ffffff;
        --accent-tint:#f3f1e6;
        --accent-hover:#735d00;
        --accent-line:#d5cca6;
        --secondary:#0a7d5a;
        --secondary-ink:#ffffff;
        --secondary-tint:#e7f2ef;"
    `);
  });

  it("snapshot: legacy accent_color only (fixture site A)", () => {
    expect(paletteCssVars({ accent_color: "#b5471f" })).toMatchInlineSnapshot(`
      "  --accent:#b5471f;
        --accent-ink:#ffffff;
        --accent-tint:#f8ede9;
        --accent-hover:#a4401c;
        --accent-line:#e5bfb1;"
    `);
  });
});
