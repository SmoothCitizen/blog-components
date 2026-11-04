// Palette derivation + WCAG contrast guard.
//
// Same algorithm the hosted-blog renderer uses, so a blog that moves from the
// hosted renderer to its own repo keeps byte-identical color tokens.
//
// `config/theme.json` carries RESOLVED hexes only (`palette.primary/secondary`,
// written by the API at theme-save time; no preset ids are resolved here). From one
// base accent this module derives the whole token set the stylesheet uses, and
// guards it so that NOTHING a customer picks can produce unreadable chrome:
//
//   - `--accent`      the base accent, darkened/lightened until it reads at
//                     WCAG AA (>= 4.5:1) against the page background
//   - `--accent-ink`  text-on-accent — black or white, whichever contrasts more
//   - `--accent-tint` ~10% accent mixed into the page bg (panels, header band)
//   - `--accent-hover` one lightness step further in the guard direction
//   - `--accent-line` ~35% accent mixed into the page bg (hairlines)
//   - `--secondary`, `--secondary-ink`, `--secondary-tint` — same treatment,
//     emitted ONLY when the manifest carries a valid secondary
//
// Resolution order for the base accent: `theme.palette.primary` → legacy
// `theme.accent_color` → DEFAULT_ACCENT. Every candidate is validated STRICTLY
// as a hex before use; anything else falls through to the next candidate. The
// emitted values are always re-serialized 6-digit lowercase hexes, so nothing
// customer-supplied ever reaches the inline <style> verbatim.
//
// Pure functions, no I/O: every step is unit-testable (test/palette.test.ts).

import { escapeHtml } from "../util";
import type { ThemeConfig } from "./schema";

export const PAGE_BG = "#ffffff";
export const DEFAULT_ACCENT = "#1f2933"; // slate — the pre-palette default
export const AA_CONTRAST = 4.5;
export const TINT_MIX = 0.1;
export const LINE_MIX = 0.35;
export const GUARD_STEP = 0.04; // HSL lightness per guard step
export const GUARD_MAX_STEPS = 24; // 24 x 4% covers the full lightness range

const BLACK = "#000000";
const WHITE = "#ffffff";

export interface Rgb {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

export interface DerivedPalette {
  accent: string;
  accentInk: string;
  accentTint: string;
  accentHover: string;
  accentLine: string;
  secondary: string | null;
  secondaryInk: string | null;
  secondaryTint: string | null;
}

// ---------------------------------------------------------------------------
// Parsing / validation

// Strict hex validation. Accepts `#rrggbb` and `#rgb` (expanded); returns a
// lowercase 6-digit hex, or null for anything else (keywords, rgb()/hsl(),
// 8-digit alpha, whitespace-padded garbage, non-strings).
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  if (short) {
    const [, r, g, b] = short;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): Rgb {
  const n = normalizeHex(hex);
  if (!n) throw new Error(`hexToRgb: not a hex color: ${hex}`);
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to2 = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

// ---------------------------------------------------------------------------
// sRGB <-> HSL

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

// ---------------------------------------------------------------------------
// WCAG 2.x relative luminance + contrast ratio

function linearChannel(byte: number): number {
  const c = byte / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

// Symmetric: contrastRatio(a, b) === contrastRatio(b, a). Range 1..21.
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Mixing + lightness stepping

// `weight` of `a` mixed into `b` (0 ⇒ b, 1 ⇒ a). Linear in sRGB bytes — the
// same model as CSS `color-mix(in srgb, …)`.
export function mix(a: string, b: string, weight: number): string {
  const w = Math.min(1, Math.max(0, weight));
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r * w + cb.r * (1 - w),
    g: ca.g * w + cb.g * (1 - w),
    b: ca.b * w + cb.b * (1 - w),
  });
}

// Move HSL lightness by `delta` (negative = darken), clamped to [0, 1].
export function shiftLightness(hex: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  const l = Math.min(1, Math.max(0, hsl.l + delta));
  return rgbToHex(hslToRgb({ ...hsl, l }));
}

// The guard direction for a given background: on a light background the
// accent must get DARKER to gain contrast; on a dark one, LIGHTER.
function guardDirection(bg: string): -1 | 1 {
  return relativeLuminance(bg) >= 0.5 ? -1 : 1;
}

// ---------------------------------------------------------------------------
// The contrast guard

// Darken (light bg) / lighten (dark bg) the accent in GUARD_STEP lightness
// steps until it reaches AA_CONTRAST against `bg`. If the input already passes
// it is returned unchanged. If the range is exhausted without passing (cannot
// happen against white or black, kept as a fail-closed backstop) the default
// slate is returned — never an unreadable value.
export function guardAccent(hex: string, bg: string = PAGE_BG): string {
  const start = normalizeHex(hex);
  if (!start) return DEFAULT_ACCENT;
  const dir = guardDirection(bg);
  let current = start;
  for (let step = 0; step <= GUARD_MAX_STEPS; step += 1) {
    if (contrastRatio(current, bg) >= AA_CONTRAST) return current;
    const next = shiftLightness(current, dir * GUARD_STEP);
    if (next === current) break; // clamped at the end of the range
    current = next;
  }
  return contrastRatio(current, bg) >= AA_CONTRAST ? current : DEFAULT_ACCENT;
}

// Text-on-accent: black or white, whichever contrasts more against the accent.
export function inkFor(accent: string): string {
  return contrastRatio(accent, BLACK) >= contrastRatio(accent, WHITE) ? BLACK : WHITE;
}

// A guarded accent plus an ink that ALSO reaches AA. Against white or black
// backgrounds an accent that passes the bg guard always has a passing ink
// (the bg itself is a candidate ink), so the nudge loop only fires for
// exotic backgrounds — it moves the accent further in the guard direction
// until an ink passes, then re-checks the bg (monotone in that direction).
export function guardPair(hex: string, bg: string = PAGE_BG): { accent: string; ink: string } {
  let accent = guardAccent(hex, bg);
  const dir = guardDirection(bg);
  for (let step = 0; step <= GUARD_MAX_STEPS; step += 1) {
    const ink = inkFor(accent);
    if (contrastRatio(accent, ink) >= AA_CONTRAST) return { accent, ink };
    const next = shiftLightness(accent, dir * GUARD_STEP);
    if (next === accent) break;
    accent = next;
  }
  // Backstop: the default slate passes both checks on a white page.
  return { accent: DEFAULT_ACCENT, ink: inkFor(DEFAULT_ACCENT) };
}

// ---------------------------------------------------------------------------
// Derivation from the manifest theme

// Minimal shape this module needs from the manifest — the full `Theme` type
// satisfies it, and tests can pass a bare object.
export type PaletteSource = {
  accent_color?: ThemeConfig["accent_color"] | undefined;
  palette?: { primary?: string | null; secondary?: string | null } | null;
};

// palette.primary → legacy accent_color → default slate. Each candidate is
// validated; an invalid one falls through rather than being coerced.
export function resolveBaseAccent(theme: PaletteSource): string {
  return (
    normalizeHex(theme.palette?.primary) ?? normalizeHex(theme.accent_color) ?? DEFAULT_ACCENT
  );
}

export function derivePalette(theme: PaletteSource, bg: string = PAGE_BG): DerivedPalette {
  const dir = guardDirection(bg);
  const { accent, ink } = guardPair(resolveBaseAccent(theme), bg);

  const secondaryHex = normalizeHex(theme.palette?.secondary);
  const secondaryPair = secondaryHex ? guardPair(secondaryHex, bg) : null;

  return {
    accent,
    accentInk: ink,
    accentTint: mix(accent, bg, TINT_MIX),
    accentHover: shiftLightness(accent, dir * GUARD_STEP),
    accentLine: mix(accent, bg, LINE_MIX),
    secondary: secondaryPair?.accent ?? null,
    secondaryInk: secondaryPair?.ink ?? null,
    secondaryTint: secondaryPair ? mix(secondaryPair.accent, bg, TINT_MIX) : null,
  };
}

// The CSS custom-property block for the inline <style>. Values are already
// constrained to `#rrggbb` by construction; escaping is belt-and-suspenders,
// matching how theme.ts treats every resolved token.
export function paletteCssVars(theme: PaletteSource, bg: string = PAGE_BG): string {
  const p = derivePalette(theme, bg);
  const lines = [
    `  --accent:${escapeHtml(p.accent)};`,
    `  --accent-ink:${escapeHtml(p.accentInk)};`,
    `  --accent-tint:${escapeHtml(p.accentTint)};`,
    `  --accent-hover:${escapeHtml(p.accentHover)};`,
    `  --accent-line:${escapeHtml(p.accentLine)};`,
  ];
  if (p.secondary && p.secondaryInk && p.secondaryTint) {
    lines.push(
      `  --secondary:${escapeHtml(p.secondary)};`,
      `  --secondary-ink:${escapeHtml(p.secondaryInk)};`,
      `  --secondary-tint:${escapeHtml(p.secondaryTint)};`,
    );
  }
  return lines.join("\n");
}
