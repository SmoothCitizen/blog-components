// Background motifs (v0.6.0, extended in v0.7.0) and the contrast arithmetic
// behind them. Split out of css.ts so both the v0.6.0 stylesheet path and the
// v0.7.0 fidelity path (./fidelity.ts) share one implementation. Every value
// emitted here is either a re-serialized hex, an rgba() built from one, a
// number this module computed, or a fixed literal — nothing from the theme
// reaches CSS verbatim.

import { AA_CONTRAST, contrastRatio, derivePalette, hexToRgb, mix, type PaletteSource } from "./palette";
import {
  DEFAULT_PATTERN,
  PATTERN_IMAGE_EXTENSIONS,
  PATTERN_VARIANTS,
  safePublicPath,
  type PatternVariant,
  type ThemeConfig,
} from "./schema";

// The page-level colors, resolved (see css.ts `resolveSurface`).
export interface ResolvedSurface {
  bg: string;
  ink: string;
  muted: string;
  line: string;
  panel: string;
  softInk: string;
  dark: boolean;
}

export type BuiltInPattern = Exclude<PatternVariant, "none">;

// How strongly each built-in motif mixes the guarded accent into the page bg
// (before the contrast guard steps it down). Thin-line motifs can carry more
// color than the zig-zag, which fills half its area.
export const PATTERN_WEIGHTS: Readonly<Record<BuiltInPattern, number>> = {
  dots: 0.4,
  grid: 0.22,
  pinstripe: 0.2,
  herringbone: 0.08,
};
export const PATTERN_WEIGHT_STEP = 0.02;
// The custom-image veil: the surface color laid over the image at this alpha
// (or more, until the text contrast holds).
export const PATTERN_VEIL_MIN_ALPHA = 0.82;
export const PATTERN_VEIL_STEP = 0.02;

// True when every `text` color stays readable on `color`: at least AA, or — for
// a text color already below AA on the plain `base` surface — no worse than it
// was there.
export function keepsTextContrast(color: string, base: string, texts: readonly string[]): boolean {
  return texts.every((text) => contrastRatio(text, color) >= Math.min(AA_CONTRAST, contrastRatio(text, base)));
}

// The guarded motif color: `accent` mixed into `mixBase` starting at `weight`,
// stepped down until every text color keeps its contrast on the motif color
// against every surface in `bases`. Null when no weight passes.
export function guardedMotifInk(
  accent: string,
  mixBase: string,
  weight: number,
  bases: readonly string[],
  texts: readonly string[],
): string | null {
  for (let w = weight; w > 0.005; w -= PATTERN_WEIGHT_STEP) {
    const color = mix(accent, mixBase, w);
    if (color === mixBase) break;
    if (bases.every((b) => keepsTextContrast(color, b, texts))) return color;
  }
  return null;
}

// The motif color for a built-in pattern: the guarded accent mixed into the
// page bg at the pattern's weight, stepped down until the page ink AND muted
// text keep their contrast on it — against both the page bg (post header) and
// the panel (hero) — because motif pixels sit directly under text. Null when no
// weight passes: the motif is then not drawn at all.
export function patternInk(
  pattern: BuiltInPattern,
  accent: string,
  surface: Pick<ResolvedSurface, "bg" | "ink" | "muted" | "panel">,
): string | null {
  return guardedMotifInk(accent, surface.bg, PATTERN_WEIGHTS[pattern], [surface.bg, surface.panel], [
    surface.ink,
    surface.muted,
  ]);
}

// The veil alpha for a custom pattern image: the smallest alpha (>= the
// minimum) at which a fully black AND a fully white image pixel, seen through
// the veil, still keep the ink + muted contrast on every surface the motif is
// drawn on (the page bg for the post header, the panel for the hero). 1 = the
// image is fully covered (always safe).
export function patternVeilAlpha(surfaces: readonly string[], texts: readonly string[]): number {
  for (let step = 0; ; step += 1) {
    const a = Math.round((PATTERN_VEIL_MIN_ALPHA + step * PATTERN_VEIL_STEP) * 100) / 100;
    if (a >= 1) return 1;
    const ok = surfaces.every((bg) => ["#000000", "#ffffff"].every((px) => keepsTextContrast(mix(bg, px, a), bg, texts)));
    if (ok) return a;
  }
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// `:root{--pattern-image:url("/…")}` for a custom motif, or "". The path is
// re-validated with `safePublicPath` (svg/png/webp), so it can never close the
// url(), the rule or the <style> tag. `name` is a fixed literal chosen by the
// caller (`pattern-image` / `pattern-image-post`), never a theme value.
export function patternImageVar(key: string | null | undefined, name: "pattern-image" | "pattern-image-post" = "pattern-image"): string {
  const path = safePublicPath(key, PATTERN_IMAGE_EXTENSIONS);
  return path ? `:root{--${name}:url("/${path}")}` : "";
}

// The background layers for each built-in motif (all drawn in --pattern-ink).
export const PATTERN_LAYERS: Readonly<Record<BuiltInPattern, string>> = {
  dots: "background-image:radial-gradient(var(--pattern-ink) 1.3px,transparent 1.8px);background-size:18px 18px",
  grid:
    "background-image:linear-gradient(var(--pattern-ink) 1px,transparent 1px),linear-gradient(90deg,var(--pattern-ink) 1px,transparent 1px);background-size:24px 24px",
  pinstripe: "background-image:repeating-linear-gradient(90deg,var(--pattern-ink) 0 1px,transparent 1px 10px)",
  herringbone:
    "background-image:linear-gradient(135deg,var(--pattern-ink) 25%,transparent 25%),linear-gradient(225deg,var(--pattern-ink) 25%,transparent 25%),linear-gradient(315deg,var(--pattern-ink) 25%,transparent 25%),linear-gradient(45deg,var(--pattern-ink) 25%,transparent 25%);" +
    "background-position:-12px 0,-12px 0,0 0,0 0;background-size:24px 24px",
};

// True when the theme draws a motif (a valid custom image, or a built-in
// pattern) on the hero. Through v0.6.1 this also decided the post-header
// wrapper; v0.7.0 uses `postHeaderMode` (./fidelity.ts) for that.
export function hasPattern(theme: Partial<Pick<ThemeConfig, "pattern" | "pattern_image_key">>): boolean {
  if (safePublicPath(theme.pattern_image_key, PATTERN_IMAGE_EXTENSIONS)) return true;
  return PATTERN_VARIANTS.some((p) => p !== "none" && p === theme.pattern);
}

// The v0.6.0 motif stylesheet: one motif drawn on the hero AND the post header,
// subtle (guarded ink / >= 0.82 veil), covering the whole box.
export function legacyPatternCss(
  theme: PaletteSource & Partial<Pick<ThemeConfig, "pattern" | "pattern_image_key">>,
  s: ResolvedSurface,
): string | null {
  // The post header becomes a padded box only when a motif is drawn on it.
  const box =
    `.post-header{padding:22px 20px;margin:22px 0 6px;border:1px solid var(--line);border-radius:var(--radius)}\n` +
    `.post-header h1{margin-top:0}`;
  if (safePublicPath(theme.pattern_image_key, PATTERN_IMAGE_EXTENSIONS)) {
    const alpha = patternVeilAlpha([s.bg, s.panel], [s.ink, s.muted]);
    const veil = (hex: string) => `linear-gradient(${rgba(hex, alpha)},${rgba(hex, alpha)})`;
    return (
      `/* background motif: custom image under a surface veil (v0.6.0) */\n` +
      `.index-hero{background-image:${veil(s.panel)},var(--pattern-image)}\n` +
      `.post-header{background-image:${veil(s.bg)},var(--pattern-image)}\n` +
      box
    );
  }
  const pattern = PATTERN_VARIANTS.find((p) => p === theme.pattern) ?? DEFAULT_PATTERN;
  if (pattern === "none") return null;
  const ink = patternInk(pattern, derivePalette(theme, s.bg).accent, s);
  if (!ink) return null;
  return (
    `/* background motif: ${pattern} (v0.6.0) */\n` +
    `.index-hero,.post-header{--pattern-ink:${ink};${PATTERN_LAYERS[pattern]}}\n` +
    box
  );
}
