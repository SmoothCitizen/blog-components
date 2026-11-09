// v0.7.0 fidelity keys: the stylesheet for the optional theme keys that let a
// site match an existing design more closely (motif strength / placement /
// per-target motifs, hero wash + style, list + card layout, labels, footer
// variants, nav + header details, post-header layout, dividers).
//
// The byte-compat rule: a theme that sets none of these keys gets `[]` from
// `fidelityCss`, the v0.6.0 motif CSS from `motifCss`, the v0.6.0 image var
// from `motifImageVars` and `{ wrap: hasPattern }` from `postHeaderMode` — so
// its stylesheet and markup are byte-identical to v0.6.1.
//
// Safety: every value is RE-validated here through the same allow-lists the
// parser uses (a hand-built theme object cannot bypass them). Colours reach
// CSS only as re-serialized hexes / rgba() built from them; lengths only via
// `safeLetterSpacing`; numbers only via `boundedInt`; everything else is a
// fixed literal picked from an allow-list. Text-bearing surfaces keep their
// contrast: the motif colour is guarded (subtle), or a text-safe scrim sits
// behind the text block (medium/bold) at the smallest alpha that keeps the ink
// and muted text readable over the worst motif pixel.

import {
  AA_CONTRAST,
  contrastRatio,
  derivePalette,
  guardAccent,
  mix,
  normalizeHex,
  type PaletteSource,
} from "./palette";
import {
  PATTERN_LAYERS,
  PATTERN_WEIGHTS,
  guardedMotifInk,
  keepsTextContrast,
  legacyPatternCss,
  patternImageVar,
  patternVeilAlpha,
  rgba,
  type BuiltInPattern,
  type ResolvedSurface,
} from "./pattern";
import {
  AUTHOR_STYLES,
  BLOCK_ALIGNS,
  BRAND_SIZES,
  CARD_CTA_POSITIONS,
  CARD_STYLES,
  CONTENT_WIDTH_MAX,
  CONTENT_WIDTH_MIN,
  DEFAULT_MONO_FONT,
  DESCRIPTION_STYLES,
  DIVIDER_STYLES,
  EXCERPT_LINES_MAX,
  EXCERPT_LINES_MIN,
  EYEBROW_COLORS,
  FOOTER_SURFACES,
  FOOTER_VARIANTS,
  HEADER_SURFACES,
  HEADING_CASE_SCOPES,
  HERO_STYLES,
  INDEX_LABEL_STYLES,
  LABEL_FONTS,
  META_POSITIONS,
  NAV_FONTS,
  NAV_SIZES,
  NAV_STYLES,
  PATTERN_IMAGE_EXTENSIONS,
  PATTERN_POSITIONS,
  PATTERN_STRENGTHS,
  PATTERN_VARIANTS,
  POST_LIST_COLUMNS,
  POST_META_LAYOUTS,
  TAGLINE_POSITIONS,
  TEXT_CASES,
  TITLE_COLORS,
  boundedInt,
  parseHeroWash,
  safeFontStack,
  safeLetterSpacing,
  safePublicPath,
  type PatternPosition,
  type PatternStrength,
  type ThemeConfig,
} from "./schema";

export type FidelityInput = PaletteSource & Partial<ThemeConfig>;

// An allow-listed value or the fallback (the CSS-layer re-validation).
function pick<T extends string | number>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.find((v) => v === value) ?? fallback;
}

// ---------------------------------------------------------------------------
// Motifs
// ---------------------------------------------------------------------------

type Motif = { kind: "image"; varName: "pattern-image" | "pattern-image-post" } | { kind: "builtin"; pattern: BuiltInPattern };

function builtIn(value: unknown): BuiltInPattern | null {
  const p = PATTERN_VARIANTS.find((v) => v === value);
  return p && p !== "none" ? p : null;
}

function heroMotif(t: FidelityInput): Motif | null {
  if (safePublicPath(t.pattern_image_key, PATTERN_IMAGE_EXTENSIONS)) return { kind: "image", varName: "pattern-image" };
  const p = builtIn(t.pattern);
  return p ? { kind: "builtin", pattern: p } : null;
}

// The post-header motif: its own image, else its own pattern ("none" = no
// motif), else the hero's motif.
function postMotif(t: FidelityInput): Motif | null {
  if (safePublicPath(t.post_header_pattern_image_key, PATTERN_IMAGE_EXTENSIONS)) {
    return { kind: "image", varName: "pattern-image-post" };
  }
  const own = PATTERN_VARIANTS.find((v) => v === t.post_header_pattern);
  if (own) return own === "none" ? null : { kind: "builtin", pattern: own };
  return heroMotif(t);
}

function sameMotif(a: Motif | null, b: Motif | null): boolean {
  if (!a || !b) return a === b;
  if (a.kind === "image" && b.kind === "image") return a.varName === b.varName;
  if (a.kind === "builtin" && b.kind === "builtin") return a.pattern === b.pattern;
  return false;
}

const strengthOf = (t: FidelityInput): PatternStrength => pick(PATTERN_STRENGTHS, t.pattern_strength, "subtle");
const positionOf = (t: FidelityInput): PatternPosition => pick(PATTERN_POSITIONS, t.pattern_position, "cover");
const heroStyleOf = (t: FidelityInput) => pick(HERO_STYLES, t.hero_style, "panel");

// True when the theme uses only v0.6.0 motif keys, so the v0.6.0 motif CSS
// (and markup) applies unchanged.
export function usesLegacyMotif(t: FidelityInput): boolean {
  return (
    strengthOf(t) === "subtle" &&
    positionOf(t) === "cover" &&
    heroStyleOf(t) === "panel" &&
    !parseHeroWash(t.hero_wash) &&
    sameMotif(heroMotif(t), postMotif(t))
  );
}

// How the post page renders its title block:
//   - `wrap`: inside a `<header class="post-header">` (v0.6.0: only with a motif)
//   - `decorated`: the header is a padded box (motif, wash or inverse style)
//   - `scrim`: the text sits in a `.post-header-text` block that carries the
//     text-safe scrim (medium/bold motif strength)
//   - `center`: centered title block
export interface PostHeaderMode {
  wrap: boolean;
  decorated: boolean;
  scrim: boolean;
  center: boolean;
}

export function postHeaderMode(t: FidelityInput): PostHeaderMode {
  const motif = postMotif(t);
  const decorated = !!motif || !!parseHeroWash(t.hero_wash) || heroStyleOf(t) === "inverse";
  const center = pick(BLOCK_ALIGNS, t.post_header_align, "left") === "center";
  const eyebrow = typeof t.post_header_eyebrow === "string" && t.post_header_eyebrow.length > 0;
  const split = pick(POST_META_LAYOUTS, t.post_meta_layout, "classic") === "split";
  return {
    wrap: decorated || center || eyebrow || split,
    decorated,
    scrim: !!motif && strengthOf(t) !== "subtle",
    center,
  };
}

// The pattern-image custom properties, appended AFTER class prefixing (so the
// file extension is not rewritten). v0.6.0 themes get exactly the v0.6.0 var.
export function motifImageVars(t: FidelityInput): string {
  if (usesLegacyMotif(t)) return patternImageVar(t.pattern_image_key);
  return [patternImageVar(t.pattern_image_key), patternImageVar(t.post_header_pattern_image_key, "pattern-image-post")]
    .filter(Boolean)
    .join("\n");
}

// Motif strength: how far the built-in motif weight is multiplied (capped),
// and the opacity of a custom image. "subtle" keeps the v0.6.0 guard/veil.
export const PATTERN_STRENGTH_MULTIPLIER: Readonly<Record<Exclude<PatternStrength, "subtle">, number>> = {
  medium: 2.5,
  bold: 4.5,
};
export const PATTERN_STRENGTH_CAP = 0.9;
export const PATTERN_IMAGE_OPACITY: Readonly<Record<Exclude<PatternStrength, "subtle">, number>> = {
  medium: 0.5,
  bold: 0.9,
};
export const SCRIM_MIN_ALPHA = 0.5;
export const SCRIM_STEP = 0.02;
// The hero wash: each colour mixed into the surface at most this much, stepped
// down until the text keeps its contrast.
export const WASH_MAX_WEIGHT = 0.3;
export const WASH_STEP = 0.02;

// Where the motif shows: a mask confines it (cover = everywhere, as v0.6.0).
const POSITION_MASKS: Readonly<Record<Exclude<PatternPosition, "cover">, string>> = {
  "top-left": "radial-gradient(120% 130% at 0 0,#000 0,#000 25%,transparent 70%)",
  "top-right": "radial-gradient(120% 130% at 100% 0,#000 0,#000 25%,transparent 70%)",
  center: "radial-gradient(70% 80% at 50% 50%,#000 0,#000 30%,transparent 100%)",
  top: "linear-gradient(#000 0,#000 30%,transparent 85%)",
};
const POSITION_IMAGE: Readonly<Record<Exclude<PatternPosition, "cover">, string>> = {
  "top-left": "background-repeat:no-repeat;background-position:left top;background-size:auto 100%",
  "top-right": "background-repeat:no-repeat;background-position:right top;background-size:auto 100%",
  center: "background-repeat:no-repeat;background-position:center;background-size:auto 100%",
  top: "background-repeat:repeat-x;background-position:center top",
};

// The smallest scrim alpha (>= SCRIM_MIN_ALPHA) at which every pixel the motif
// can put under the text, seen through a `scrim`-coloured layer, keeps the
// ink + muted contrast. 1 = the scrim fully covers the motif.
export function scrimAlpha(scrim: string, pixels: readonly string[], texts: readonly string[]): number {
  for (let step = 0; ; step += 1) {
    const a = Math.round((SCRIM_MIN_ALPHA + step * SCRIM_STEP) * 100) / 100;
    if (a >= 1) return 1;
    if (pixels.every((px) => keepsTextContrast(mix(scrim, px, a), scrim, texts))) return a;
  }
}

// The two wash colours (plus their midpoint), mixed into `base` and stepped
// down until the text keeps its contrast on all three. Null = no weight passes
// (the wash is skipped).
export function washColors(
  from: string,
  to: string,
  base: string,
  texts: readonly string[],
): { from: string; to: string; mid: string } | null {
  const a0 = normalizeHex(from);
  const b0 = normalizeHex(to);
  if (!a0 || !b0) return null;
  for (let w = WASH_MAX_WEIGHT; w > 0.005; w -= WASH_STEP) {
    const a = mix(a0, base, w);
    const b = mix(b0, base, w);
    const m = mix(a, b, 0.5);
    if (a === base && b === base) break;
    if ([a, b, m].every((c) => keepsTextContrast(c, base, texts))) return { from: a, to: b, mid: m };
  }
  return null;
}

// A colour guarded to AA against every surface in `bases` (light bases → it
// darkens, dark → it lightens). Null when no lightness passes on all of them.
export function guardAgainst(hex: string, bases: readonly string[]): string | null {
  let c = normalizeHex(hex);
  if (!c) return null;
  for (let round = 0; round < 4; round += 1) {
    for (const b of bases) if (contrastRatio(c, b) < AA_CONTRAST) c = guardAccent(c, b);
  }
  return bases.every((b) => contrastRatio(c!, b) >= AA_CONTRAST) ? c : null;
}

// The inverted surface (`hero_style: "inverse"`): the page ink becomes the
// background and the page bg the text — AA by the surface guard. Muted text is
// a mix toward the page bg, stepped until it reads at AA on the inverse bg.
export function inverseSurface(s: ResolvedSurface): { bg: string; ink: string; muted: string; line: string } {
  let muted = s.bg;
  for (let w = 0.72; w < 1; w += 0.04) {
    const m = mix(s.bg, s.ink, w);
    if (contrastRatio(m, s.ink) >= AA_CONTRAST) {
      muted = m;
      break;
    }
  }
  return { bg: s.ink, ink: s.bg, muted, line: mix(s.bg, s.ink, 0.22) };
}

// The eyebrow colour source for `eyebrow_color` (null = muted, the default).
function eyebrowSource(t: FidelityInput, pageBg: string): string | null {
  const choice = pick(EYEBROW_COLORS, t.eyebrow_color, "muted");
  if (choice === "muted") return null;
  const accent = derivePalette(t, pageBg).accent;
  if (choice === "accent2") return normalizeHex(t.accent_color_2) ?? accent;
  return accent;
}

interface Target {
  sel: string;
  textSel: string;
  base: string;
  texts: string[];
  motif: Motif | null;
}

function motifLayerCss(t: FidelityInput, target: Target, bases: readonly string[]): string[] {
  const { motif } = target;
  if (!motif) return [];
  const strength = strengthOf(t);
  const position = positionOf(t);
  const mask = position === "cover" ? "" : `;-webkit-mask-image:${POSITION_MASKS[position]};mask-image:${POSITION_MASKS[position]}`;
  let layer: string;
  let pixels: string[];
  if (motif.kind === "builtin") {
    const accent = derivePalette(t, target.base).accent;
    const weight = PATTERN_WEIGHTS[motif.pattern];
    const ink =
      strength === "subtle"
        ? guardedMotifInk(accent, target.base, weight, bases, target.texts)
        : mix(accent, target.base, Math.min(PATTERN_STRENGTH_CAP, weight * PATTERN_STRENGTH_MULTIPLIER[strength]));
    if (!ink || ink === target.base) return [];
    layer = `--pattern-ink:${ink};${PATTERN_LAYERS[motif.pattern]}`;
    pixels = [ink, ...bases];
  } else {
    const opacity =
      strength === "subtle"
        ? Math.round((1 - patternVeilAlpha(bases, target.texts)) * 100) / 100
        : PATTERN_IMAGE_OPACITY[strength];
    if (opacity <= 0) return [];
    const placement = position === "cover" ? "" : `;${POSITION_IMAGE[position]}`;
    layer = `background-image:var(--${motif.varName})${placement};opacity:${opacity}`;
    pixels = ["#000000", "#ffffff"];
  }
  const out = [
    `${target.sel}{position:relative;isolation:isolate}`,
    `${target.sel}::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;${layer}${mask}}`,
  ];
  if (strength !== "subtle") {
    // The text-safe scrim: the target surface behind the text block, at the
    // smallest alpha that keeps the text readable over any motif pixel.
    const a = scrimAlpha(target.base, pixels, target.texts);
    const fill = rgba(target.base, a);
    out.push(`${target.textSel}{position:relative;background-color:${fill};box-shadow:0 0 22px 14px ${fill};border-radius:var(--radius)}`);
  }
  return out;
}

// The v0.7.0 motif / hero-style stylesheet for the hero and the post header.
function fidelityMotifCss(t: FidelityInput, s: ResolvedSurface): string | null {
  const style = heroStyleOf(t);
  const inverse = style === "inverse" ? inverseSurface(s) : null;
  const pageTexts = [s.ink, s.muted];
  const texts = inverse ? [inverse.ink, inverse.muted] : pageTexts;
  const hero: Target = {
    sel: ".index-hero",
    textSel: ".index-hero .index-hero-text",
    base: inverse ? inverse.bg : style === "flat" ? s.bg : s.panel,
    texts,
    motif: heroMotif(t),
  };
  const post: Target = {
    sel: ".post-header",
    textSel: ".post-header .post-header-text",
    base: inverse ? inverse.bg : s.bg,
    texts,
    motif: postMotif(t),
  };
  const mode = postHeaderMode(t);
  const wash = parseHeroWash(t.hero_wash);
  const lines: string[] = [`/* hero + post header: style ${style}, motif ${strengthOf(t)} / ${positionOf(t)} (v0.7.0) */`];

  if (mode.decorated) {
    lines.push(
      `.post-header{padding:22px 20px;margin:22px 0 6px;border:1px solid var(--line);border-radius:var(--radius)}`,
      `.post-header h1{margin-top:0}`,
    );
  }
  if (style === "flat") {
    lines.push(`.index-hero{background:none;border:0;border-bottom:1px solid var(--line);border-radius:0}`);
    if (!hero.motif && !wash) lines.push(`.index-hero{padding-left:0;padding-right:0}`);
    if (mode.decorated) lines.push(`.post-header{border:0;border-bottom:1px solid var(--line);border-radius:0}`);
  }
  if (inverse) {
    const p = derivePalette(t, inverse.bg);
    const eyebrowHex = eyebrowSource(t, inverse.bg);
    const eyebrow = eyebrowHex ? guardAgainst(eyebrowHex, [inverse.bg]) : null;
    lines.push(
      `.index-hero,.post-header{--ink:${inverse.ink};--muted:${inverse.muted};--bg:${inverse.bg};--panel:${inverse.bg};--line:${inverse.line};` +
        `--accent:${p.accent};--accent-hover:${p.accentHover};--accent-ink:${p.accentInk};--accent-tint:${p.accentTint};--accent-line:${p.accentLine};` +
        `${eyebrow ? `--eyebrow:${eyebrow};` : ""}color:var(--ink);background-color:var(--bg);border-color:var(--bg)}`,
    );
  }
  for (const target of [hero, post]) {
    let bases = [target.base];
    if (wash) {
      const w = washColors(wash.from, wash.to, target.base, target.texts);
      if (w) {
        bases = [w.from, w.to, w.mid];
        const angle = boundedInt(wash.angle, 0, 360) ?? 135;
        lines.push(`${target.sel}{background-image:linear-gradient(${angle}deg,${w.from},${w.to})}`);
      }
    }
    lines.push(...motifLayerCss(t, target, bases));
  }
  return lines.length > 1 ? lines.join("\n") : null;
}

// The motif CSS slot of the stylesheet: the v0.6.0 rules for a v0.6.0 theme,
// else the v0.7.0 rules.
export function motifCss(t: FidelityInput, s: ResolvedSurface): string | null {
  return usesLegacyMotif(t) ? legacyPatternCss(t, s) : fidelityMotifCss(t, s);
}

// ---------------------------------------------------------------------------
// Everything else
// ---------------------------------------------------------------------------

const CARD = "[data-layout] .post-cards .post-card";
const LABEL_SELECTORS = ".index-hero .index-hero-eyebrow,.index-label,.post-header-eyebrow,.post-card-feature-label,.footer-links-label";

// The v0.7.0 parts of the stylesheet (each a commented block). [] when no
// v0.7.0 key is set.
export function fidelityCss(t: FidelityInput, s: ResolvedSurface): string[] {
  const parts: string[] = [];
  const add = (title: string, ...rules: string[]) => parts.push(`/* ${title} (v0.7.0) */\n${rules.join("\n")}`);
  const tracking = safeLetterSpacing(t.label_tracking);
  const mono = safeFontStack(t.mono_font) ?? DEFAULT_MONO_FONT;
  const palette = derivePalette(t, s.bg);

  // -- layout width ---------------------------------------------------------
  const width = boundedInt(t.content_width, CONTENT_WIDTH_MIN, CONTENT_WIDTH_MAX);
  if (width) {
    add(
      "content width",
      `.wrap{max-width:${width}px}`,
      ...(t.header_align === "content" ? [`[data-header] .site-header .wrap{max-width:${width}px}`] : []),
    );
  }

  // -- header ---------------------------------------------------------------
  const brandSize = pick(BRAND_SIZES, t.brand_size, "md");
  if (brandSize !== "md") {
    add("brand size", `[data-header] .site-header .brand .name{font-size:${brandSize === "sm" ? 20 : 34}px}`);
  }
  const headerSurface = HEADER_SURFACES.find((v) => v === t.header_surface);
  if (headerSurface) {
    const bg = headerSurface === "tint" ? "var(--accent-tint)" : headerSurface === "panel" ? "var(--panel)" : "var(--bg)";
    const line = headerSurface === "tint" ? "var(--accent-line)" : "var(--line)";
    add("header surface", `[data-header] .site-header{background:${bg};border-bottom-color:${line}}`);
  }
  if (pick(TAGLINE_POSITIONS, t.tagline_position, "inline") === "above") {
    add(
      "tagline above the brand",
      `[data-header] .site-header .brand{flex-direction:column;align-items:flex-start;gap:6px}`,
      `[data-header="centered"] .site-header .brand{align-items:center}`,
      `.site-header .tagline{order:-1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:${tracking ?? ".14em"};color:var(--eyebrow,var(--muted))}`,
    );
  }
  if (pick(NAV_FONTS, t.nav_font, "body") === "mono") add("nav font", `.site-nav{font-family:${mono}}`);
  if (pick(NAV_SIZES, t.nav_size, "md") === "sm") add("nav size", `[data-header] .site-nav{font-size:13px}`);
  if (pick(NAV_STYLES, t.nav_style, "plain") === "ruled") {
    add(
      "ruled nav (centered header)",
      `[data-header="centered"] .site-nav{align-items:center}`,
      `[data-header="centered"] .site-nav::before,[data-header="centered"] .site-nav::after{content:"";flex:1 1 40px;max-width:180px;height:1px;background:var(--line)}`,
    );
  }

  // -- eyebrows + labels ----------------------------------------------------
  const eyebrowHex = eyebrowSource(t, s.bg);
  if (eyebrowHex) {
    const bases = [s.bg, s.panel, palette.accentTint, ...(palette.secondaryTint ? [palette.secondaryTint] : [])];
    const eyebrow = guardAgainst(eyebrowHex, bases) ?? s.ink;
    add(
      "eyebrow colour",
      `:root{--eyebrow:${eyebrow}}`,
      `.index-hero .index-hero-eyebrow,.post-header-eyebrow{color:var(--eyebrow)}`,
    );
  }
  if (tracking) add("label tracking", `${LABEL_SELECTORS}{letter-spacing:${tracking}}`);
  const labelFont = LABEL_FONTS.find((v) => v === t.label_font);
  if (labelFont) {
    const family = labelFont === "heading" ? "var(--font-heading)" : labelFont === "body" ? "var(--font-body)" : mono;
    add("label font", `${LABEL_SELECTORS}{font-family:${family}}`);
  }
  if (pick(INDEX_LABEL_STYLES, t.index_label_style, "rule") === "bar") {
    add(
      "index label: accent bar",
      `.index-label{color:var(--ink);gap:10px}`,
      `.index-label::before{content:"";flex:0 0 4px;height:1.1em;border-radius:2px;background:var(--accent)}`,
      `.index-label::after{display:none}`,
    );
  }
  if (t.hero?.title_accent) {
    add("hero title accent", `.index-hero h1 .index-hero-title-accent{color:var(--accent);font-style:italic;font-weight:inherit}`);
  }

  // -- post lists -----------------------------------------------------------
  if (pick(TITLE_COLORS, t.post_title_color, "accent") === "ink") {
    add("post list titles in ink", `[data-layout] .post-list h2 a{color:var(--ink)}`, `[data-layout] .post-list h2 a:hover{color:var(--accent)}`);
  }
  const columns = POST_LIST_COLUMNS.find((v) => v === t.post_list_columns);
  if (columns) {
    const sel = `[data-layout] .post-list.post-cards,[data-layout="grid"] .post-list`;
    add(
      `post list: ${columns} column${columns === 1 ? "" : "s"}`,
      `${sel}{grid-template-columns:${columns === 1 ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))"}}`,
      ...(columns === 2 ? [`@media (max-width:640px){${sel}{grid-template-columns:minmax(0,1fr)}}`] : []),
    );
  }
  if (pick(CARD_STYLES, t.card_style, "raised") === "flat") {
    add(
      "flat cards",
      `${CARD}{box-shadow:none;transition:none}`,
      `${CARD}:hover{transform:none;box-shadow:none;border-color:var(--accent-line)}`,
    );
  }
  if (t.card_feature_first === true) {
    add(
      "featured first card",
      `${CARD}.post-card-feature{grid-column:1/-1}`,
      `${CARD}.post-card-feature h2{font-size:clamp(22px,4vw,28px)}`,
      `.post-card-feature-label{margin:0;color:var(--eyebrow,var(--accent));font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}`,
    );
  }
  if (pick(META_POSITIONS, t.card_meta_position, "top") === "bottom") {
    add("card meta at the bottom", `${CARD} .post-card-meta-bottom{margin-top:auto;padding-top:4px}`);
  }
  if (pick(CARD_CTA_POSITIONS, t.card_cta_position, "bottom") === "inline") {
    add("card CTA inline", `${CARD} .post-meta .post-card-cta{margin:0 0 0 12px;padding:0;font-size:inherit}`);
  }
  const lines = boundedInt(t.excerpt_lines, EXCERPT_LINES_MIN, EXCERPT_LINES_MAX);
  if (lines) {
    add(
      "excerpt clamp",
      `${CARD} .excerpt,[data-layout] .post-numbered .post-numbered-item .excerpt,[data-layout="journal"] .post-list .excerpt,[data-layout="grid"] .post-list .excerpt` +
        `{display:-webkit-box;-webkit-line-clamp:${lines};-webkit-box-orient:vertical;overflow:hidden}`,
    );
  }
  if (t.post_list_variant === "numbered") {
    add(
      "post list: numbered",
      `[data-layout] .post-list.post-numbered{display:block;list-style:none;margin:28px 0;padding:0}`,
      `[data-layout] .post-numbered .post-numbered-item{display:grid;grid-template-columns:2.6em minmax(0,1fr);gap:0 18px;align-items:start;padding:24px 0;margin:0;background:none;border:0;border-bottom:1px solid var(--line);border-radius:0}`,
      `.post-number{font-family:var(--font-heading);font-size:30px;line-height:1;padding-top:4px;color:var(--accent);font-variant-numeric:tabular-nums}`,
      `[data-layout] .post-numbered .post-numbered-item h2{font-size:24px;margin:4px 0 8px}`,
      `[data-layout] .post-numbered .post-numbered-date{margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase}`,
      `[data-layout] .post-numbered .excerpt{display:block;margin:0 0 10px;font-size:16px;color:${s.softInk}}`,
      `[data-layout] .post-numbered .post-numbered-byline{margin:0}`,
      `@media (max-width:560px){[data-layout] .post-numbered .post-numbered-item{grid-template-columns:2em minmax(0,1fr);gap:0 12px}.post-number{font-size:22px}}`,
    );
  }

  // -- metadata -------------------------------------------------------------
  const metaSel = ".post-list .post-meta,.post .post-meta";
  if (pick(TEXT_CASES, t.meta_case, "none") === "uppercase") {
    add("metadata case", `${metaSel}{text-transform:uppercase;letter-spacing:${tracking ?? ".06em"};font-size:13px}`);
  }
  const author = pick(AUTHOR_STYLES, t.author_style, "accent");
  if (author === "ink") {
    add("author name in ink", `.post-list .post-meta a,.post .post-meta a{color:var(--ink);font-weight:600}`);
  } else if (author === "underline") {
    add(
      "author name underlined",
      `.post-list .post-meta a,.post .post-meta a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}`,
    );
  } else if (author === "italic") {
    add(
      "italic list bylines",
      `.post-card-byline,.post-numbered-byline,.post-card-meta-author{font-style:italic}`,
      `.post-list .post-meta a{color:inherit}`,
    );
  }

  // -- post page ------------------------------------------------------------
  if (typeof t.post_header_eyebrow === "string" && t.post_header_eyebrow) {
    add(
      "post header eyebrow",
      `.post-header-eyebrow{margin:0 0 10px;color:var(--eyebrow,var(--muted));font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}`,
    );
  }
  if (pick(BLOCK_ALIGNS, t.post_header_align, "left") === "center") {
    add(
      "centered post header",
      `.post-header-center{text-align:center}`,
      `.post-header-center .post-description{margin-left:auto;margin-right:auto;max-width:62ch}`,
      `.post-header-center+.accent-rule{margin-left:auto;margin-right:auto}`,
    );
  }
  if (pick(POST_META_LAYOUTS, t.post_meta_layout, "classic") === "split") {
    add("split post meta", `.post-meta-top{margin:0 0 8px}`);
  }
  if (pick(DESCRIPTION_STYLES, t.description_style, "normal") === "italic") {
    add("italic description", `.post-description{font-style:italic}`);
  }
  const divider = pick(DIVIDER_STYLES, t.divider, "accent");
  if (divider !== "accent") {
    const rule: Record<Exclude<typeof divider, "accent">, string> = {
      none: `.accent-rule{display:none}`,
      line: `.accent-rule{width:auto;height:1px;background:var(--line);margin:24px 0}`,
      ticks: `.accent-rule{width:140px;height:10px;background:repeating-linear-gradient(90deg,var(--accent-line) 0 1px,transparent 1px 6px);margin:24px 0}`,
      cross:
        `.accent-rule{width:180px;height:10px;background:linear-gradient(45deg,transparent 42%,var(--accent-line) 42% 58%,transparent 58%),` +
        `linear-gradient(-45deg,transparent 42%,var(--accent-line) 42% 58%,transparent 58%);background-size:10px 10px;margin:24px 0}`,
    };
    add(`divider: ${divider}`, rule[divider]);
  }
  if (t.heading_case === "uppercase" && pick(HEADING_CASE_SCOPES, t.heading_case_scope, "all") === "display") {
    add("uppercase on display headings only", `h2,h3,h4{text-transform:none;letter-spacing:normal}`);
  }

  // -- footer ---------------------------------------------------------------
  const footerSurface = FOOTER_SURFACES.find((v) => v === t.footer_surface);
  const variant = pick(FOOTER_VARIANTS, t.footer_variant, "plain");
  if (footerSurface) {
    // "sunken" moves the bg AWAY from the ink (darker on a dark page, lighter
    // on a light one), so every text colour gains contrast.
    const bg =
      footerSurface === "panel"
        ? "var(--panel)"
        : footerSurface === "bg"
          ? "var(--bg)"
          : s.dark
            ? mix("#000000", s.bg, 0.35)
            : mix("#ffffff", s.bg, 0.6);
    add("footer surface", `.site-footer{background:${bg};border-top-color:var(--line)}`);
  }
  if (variant !== "plain") {
    add(
      `footer: ${variant}`,
      `.site-footer .footer-brand{display:flex;align-items:center;gap:8px;margin:0 0 8px;color:var(--ink);font-family:var(--font-heading);font-weight:700;font-size:16px}`,
      `.site-footer .footer-tagline{margin:0 0 8px;color:var(--muted)}`,
      ...(variant === "band"
        ? [
            `.site-footer.site-footer-band{border-top:3px solid var(--accent);padding:36px 0 44px${footerSurface ? "" : ";background:var(--panel)"}}`,
            `.site-footer-band .footer-brand .footer-name{font-size:22px}`,
          ]
        : [
            `.site-footer-columns .footer-columns{display:grid;gap:22px 40px;grid-template-columns:minmax(0,1fr)}`,
            `@media (min-width:720px){.site-footer-columns .footer-columns{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}}`,
            `.site-footer-columns .footer-links{display:flex;flex-direction:column;gap:6px}`,
            `.site-footer-columns .footer-links a{color:var(--muted)}`,
            `.footer-links-label{margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}`,
            `.site-footer-columns .footer-legal{margin:26px 0 0;padding-top:18px;border-top:1px solid var(--line);font-size:13px}`,
          ]),
    );
  }
  if (pick(BLOCK_ALIGNS, t.footer_align, "left") === "center") {
    add(
      "centered footer",
      `.site-footer .wrap{text-align:center}`,
      `.site-footer .footer-brand{justify-content:center}`,
      `.site-footer-columns .footer-links{align-items:center}`,
    );
  }
  return parts;
}

