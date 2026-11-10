// The blog stylesheet: layout variant x font pair x palette, plus typography
// for post bodies and the FAQ block. Fonts are self-contained system stacks, or
// (v0.5.0) font files the site serves itself via `font_files` — never an
// external font fetch, so no third-party origin on any page. Every color token
// comes from palette.ts, which validates and re-serializes each hex, so a theme
// value can never inject arbitrary CSS.

import { prefixStylesheet } from "./classes";
import { fidelityCss, motifCss, motifImageVars } from "./fidelity";
import {
  AA_CONTRAST,
  contrastRatio,
  guardAccent,
  mix,
  normalizeHex,
  paletteCssVars,
  relativeLuminance,
  type PaletteSource,
} from "./palette";
import { type ResolvedSurface } from "./pattern";
import {
  DEFAULT_FONT_PAIR,
  DEFAULT_MONO_FONT,
  parseHeadingWeight,
  safeFontStack,
  safeLetterSpacing,
  DEFAULT_LAYOUT,
  DEFAULT_RADIUS,
  DEFAULT_SPACE,
  LAYOUT_VARIANTS,
  parseFontFiles,
  type FontFile,
  type ThemeConfig,
  type ThemeSurface,
} from "./schema";

// The motif helpers moved to ./pattern in v0.7.0; re-exported for callers that
// import them from here.
export {
  PATTERN_VEIL_MIN_ALPHA,
  PATTERN_VEIL_STEP,
  PATTERN_WEIGHTS,
  PATTERN_WEIGHT_STEP,
  hasPattern,
  patternImageVar,
  patternInk,
  patternVeilAlpha,
} from "./pattern";
export { postHeaderMode } from "./fidelity";

export interface FontStack {
  heading: string;
  body: string;
}

export const FONT_PAIRS: Readonly<Record<string, FontStack>> = {
  editorial: {
    heading: '"Iowan Old Style", "Palatino Linotype", Georgia, "Times New Roman", serif',
    body: 'Georgia, "Times New Roman", serif',
  },
  modern: {
    heading: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  classic: {
    heading: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    body: 'Helvetica, Arial, "Segoe UI", sans-serif',
  },
  geometric: {
    heading: 'Futura, "Century Gothic", "Trebuchet MS", Verdana, sans-serif',
    body: 'Verdana, Geneva, "Segoe UI", Tahoma, sans-serif',
  },
};

// The API's stored default font pair is `editorial_serif`; it means the
// editorial stack.
const FONT_PAIR_ALIASES: Readonly<Record<string, string>> = {
  editorial_serif: "editorial",
};

export function resolveFont(fontPair: string): FontStack {
  const key = FONT_PAIR_ALIASES[fontPair] ?? fontPair;
  return FONT_PAIRS[key] ?? FONT_PAIRS[DEFAULT_FONT_PAIR]!;
}

export function resolveLayout(theme: Pick<ThemeConfig, "layout_variant">): string {
  return LAYOUT_VARIANTS.includes(theme.layout_variant) ? theme.layout_variant : DEFAULT_LAYOUT;
}

// Every ThemeConfig key except `font_pair` is optional, so tests (and callers)
// can pass a bare object; an absent key renders the default.
export type ThemeCssInput = PaletteSource & Pick<ThemeConfig, "font_pair"> & Partial<ThemeConfig>;

// The page-level colors, resolved. When a surface is absent (or fails
// validation) these are the EXACT v0.2.0 literals, so themeCss is byte-identical
// for a v0.2.0 config. `panel` and `softInk` are literal defaults too (they map
// to the hard-coded `#f6f7f9` / `#333` the stylesheet used before); for a custom
// surface they are derived from it so dark pages get dark panels / dim ink.

const DEFAULT_SURFACE: ResolvedSurface = {
  bg: "#ffffff",
  ink: "#1a1a1a",
  muted: "#5b6572",
  line: "#e3e6ea",
  panel: "#f6f7f9",
  softInk: "#333",
  dark: false,
};

// Below this background luminance the page is treated as dark and gets
// `color-scheme: dark` on :root (so form controls / scrollbars match).
export const DARK_SURFACE_MAX_LUMINANCE = 0.2;

// Validate + AA-check a custom surface. All four hexes must be valid AND the ink
// must read at WCAG AA (>= 4.5:1) on the bg; otherwise the surface is dropped
// (fall back to the light default) rather than ship unreadable text.
export function resolveSurface(surface: ThemeSurface | null | undefined): ResolvedSurface {
  if (!surface) return DEFAULT_SURFACE;
  const bg = normalizeHex(surface.bg);
  const ink = normalizeHex(surface.ink);
  const muted = normalizeHex(surface.muted);
  const line = normalizeHex(surface.line);
  if (!bg || !ink || !muted || !line || contrastRatio(ink, bg) < AA_CONTRAST) {
    return DEFAULT_SURFACE;
  }
  return {
    bg,
    ink,
    muted,
    line,
    panel: mix(ink, bg, 0.05), // a barely-raised surface, toward the ink
    softInk: mix(ink, bg, 0.8), // dimmed body ink (excerpts, blockquotes)
    dark: relativeLuminance(bg) < DARK_SURFACE_MAX_LUMINANCE,
  };
}

export function themeCss(theme: ThemeCssInput): string {
  const font = resolveFont(theme.font_pair);
  // Custom stacks override the preset per slot; the preset is the fallback.
  const headingFont = theme.fonts?.heading ?? font.heading;
  const bodyFont = theme.fonts?.body ?? font.body;
  const radius = theme.radius ?? DEFAULT_RADIUS;
  const space = theme.space ?? DEFAULT_SPACE;
  const s = resolveSurface(theme.surface);
  const css = `
:root{
${paletteCssVars(theme, s.bg)}
  --ink:${s.ink};
  --muted:${s.muted};
  --bg:${s.bg};
  --panel:${s.panel};
  --line:${s.line};
  --font-heading:${headingFont};
  --font-body:${bodyFont};
  --radius:${radius};
  --space:${space};${s.dark ? "\n  color-scheme:dark;" : ""}
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:var(--font-body);line-height:1.65;font-size:18px;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{color:var(--accent-hover);text-decoration:underline}
h1,h2,h3,h4{font-family:var(--font-heading);line-height:1.2;color:var(--ink)}
img{max-width:100%;height:auto}
.wrap{max-width:820px;margin:0 auto;padding:0 20px}
.skip-link{position:absolute;left:-9999px}
.skip-link:focus{left:16px;top:16px;background:var(--bg);padding:8px 12px;z-index:10}
.site-header{background:var(--accent-tint);border-bottom:1px solid var(--accent-line);padding:26px 0 18px}
.site-header .brand{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.site-header .brand .name{font-family:var(--font-heading);font-size:26px;font-weight:700;color:var(--ink)}
.site-header .logo{display:block;height:40px;width:auto}
.site-header .tagline{color:var(--muted);font-size:15px}
.site-nav{margin-top:12px;display:flex;gap:20px;font-size:15px}
.site-footer{background:var(--secondary-tint,transparent);border-top:1px solid var(--secondary,var(--line));margin-top:56px;padding:26px 0 44px;color:var(--muted);font-size:14px}
.post-list{list-style:none;margin:28px 0;padding:0}
.post-meta{color:var(--muted);font-size:14px}
.pagination{display:flex;justify-content:space-between;margin:36px 0;font-size:15px}
.empty{color:var(--muted)}
.accent-rule{height:3px;width:56px;background:var(--accent);border:0;margin:18px 0}
article.post h1{font-size:34px;margin:8px 0 6px}
.post-description{color:var(--muted);font-size:19px;margin:6px 0 0}
.hero{margin:22px 0}
.hero img{display:block;width:100%;border-radius:var(--radius)}
/* post body typography */
.post-body{margin-top:22px}
.post-body h2{margin-top:34px;font-size:26px}
.post-body h3{margin-top:26px;font-size:21px}
.post-body p,.post-body ul,.post-body ol{margin:0 0 var(--space)}
.post-body li{margin:4px 0}
.post-body blockquote{margin:22px 0;padding:4px 18px;border-left:3px solid var(--accent-line);color:${s.softInk}}
.post-body figure{margin:26px 0}
.post-body figcaption{color:var(--muted);font-size:14px;margin-top:6px}
.post-body table{border-collapse:collapse;width:100%;margin:22px 0;font-size:16px}
.post-body th,.post-body td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
.post-body th{background:var(--panel)}
.post-body code{background:var(--panel);padding:1px 5px;border-radius:4px;font-size:.9em}
.post-body pre{background:var(--panel);padding:14px;border-radius:6px;overflow-x:auto}
.post-body pre code{background:none;padding:0}
.post-body .key-takeaways{background:var(--accent-tint);border:1px solid var(--accent-line);border-radius:var(--radius);padding:6px 20px;margin:22px 0}
.post-body footer{color:var(--muted);font-size:14px;margin-top:34px}
/* FAQ block (same markup the publisher writes into post bodies) */
.post-faq{margin:38px 0 10px}
.post-faq dl{margin:0}
.post-faq dl>div{padding:14px 0;border-top:1px solid var(--line)}
.post-faq dt{font-family:var(--font-heading);font-weight:700;font-size:19px}
.post-faq dd{margin:6px 0 0}
/* author bio page: areas of expertise */
.author-expertise{margin:28px 0}
.author-expertise ul{margin:10px 0 0;padding-left:22px}
/* sponsor-disclosure layer (opt-in). A fixed amber treatment, independent of
   the site palette, so the disclosure stays "clear and conspicuous". */
.disclosure-banner{position:sticky;top:0;z-index:40;background:#fef3c7;border-bottom:1px solid #f59e0b;color:#431407;padding:12px 20px;display:flex;align-items:flex-start;gap:16px}
.disclosure-banner p{margin:0;max-width:900px;font-size:14px;line-height:1.5}
.disclosure-banner a{color:#431407;text-decoration:underline}
.disclosure-banner .disclosure-site{font-weight:700}
.disclosure-dismiss{margin-left:auto;background:none;border:0;color:#431407;font-size:18px;line-height:1;cursor:pointer;padding:2px 6px}
.disclosure-callout{margin:18px 0;border:1px solid #f59e0b;background:#fef3c7;color:#431407;border-radius:8px;padding:12px 16px}
.disclosure-callout p{margin:6px 0 0;font-size:14px;line-height:1.55}
.disclosure-callout .disclosure-label{margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.disclosure-callout a{color:#431407;text-decoration:underline}
.sponsor-attribution{margin:0 0 8px}
.sponsor-attribution .disclosure-site{font-weight:600;color:var(--ink)}
/* tag chips: tinted surface, page ink (never accent-on-tint text) */
.tag,.tags a{display:inline-block;background:var(--secondary-tint,var(--accent-tint));color:var(--ink);border:1px solid var(--accent-line);border-radius:999px;padding:2px 10px;font-size:13px;line-height:1.6}
.tag:hover,.tags a:hover{background:var(--accent-tint);color:var(--ink);text-decoration:none}
/* buttons / CTAs: accent fill with the guarded ink */
.btn,.post-body .cta a{display:inline-block;background:var(--accent);color:var(--accent-ink);border:0;border-radius:var(--radius);padding:10px 18px;font-weight:600;text-decoration:none}
.btn:hover,.post-body .cta a:hover{background:var(--accent-hover);color:var(--accent-ink);text-decoration:none}

/* layout: journal — large stacked entries */
[data-layout="journal"] .post-list li{padding:26px 0;border-bottom:1px solid var(--line)}
[data-layout="journal"] .post-list h2{font-size:26px;margin:0 0 6px}
[data-layout="journal"] .excerpt{margin:8px 0 0;color:${s.softInk}}

/* layout: grid — cards */
[data-layout="grid"] .post-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
[data-layout="grid"] .post-list li{background:var(--secondary-tint,var(--panel));border:1px solid var(--line);border-radius:var(--radius);padding:20px}
[data-layout="grid"] .post-list h2{font-size:20px;margin:0 0 8px}
[data-layout="grid"] .excerpt{font-size:15px;color:${s.softInk}}

/* layout: minimal — compact list */
[data-layout="minimal"]{font-size:17px}
[data-layout="minimal"] .post-list li{padding:12px 0;border-bottom:1px dotted var(--line);display:flex;justify-content:space-between;gap:16px;align-items:baseline}
[data-layout="minimal"] .post-list h2{font-size:18px;margin:0;font-weight:600}
[data-layout="minimal"] .excerpt{display:none}

/* header variant: classic (default, left brand + right nav) */
[data-header="classic"] .site-header .wrap{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px}
[data-header="classic"] .site-nav{margin-top:0}
/* header variant: centered — brand + nav stacked and centered */
[data-header="centered"] .site-header{text-align:center}
[data-header="centered"] .site-header .brand{justify-content:center}
[data-header="centered"] .site-nav{justify-content:center}
/* header variant: compact — tighter, single row, smaller name */
[data-header="compact"] .site-header{padding:14px 0}
[data-header="compact"] .site-header .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px}
[data-header="compact"] .site-header .brand .name{font-size:20px}
[data-header="compact"] .site-nav{margin-top:0}

/* post page variant: classic (default measure) */
[data-post="classic"] article.post{max-width:720px;margin:0 auto}
/* post page variant: wide — roomier measure */
[data-post="wide"] article.post{max-width:880px;margin:0 auto}
/* post page variant: narrow — tighter measure, larger body */
[data-post="narrow"] article.post{max-width:620px;margin:0 auto}
[data-post="narrow"] .post-body{font-size:19px}
`;
  // Optional v0.3.0 blocks, appended ONLY when their feature is active so a
  // v0.2.0 config's stylesheet is byte-identical.
  const extra = optionalCss(theme, s);
  const full = extra ? `${css}${extra}` : css;
  const prefixed = prefixStylesheet(full.trim(), theme.class_prefix);
  // @font-face rules (v0.5.0) are prepended AFTER class prefixing: they carry
  // no class selectors, and the prefixer would otherwise rewrite the `.woff2`
  // in a src url. Absent font files → the stylesheet is unchanged.
  const faces = fontFaceCss(theme.font_files ?? []);
  // The custom pattern image url (v0.6.0) is appended after prefixing for the
  // same reason (the `.svg` / `.png` extension would be rewritten): the
  // prefixed pattern rules read it through the `--pattern-image` variable.
  // v0.7.0 adds `--pattern-image-post` for a separate post-header image.
  const patternImage = motifImageVars(theme);
  const withImage = patternImage ? `${prefixed}\n${patternImage}` : prefixed;
  return faces ? `${faces}\n${withImage}` : withImage;
}

// One `@font-face` rule per self-hosted font file (v0.5.0), font-display: swap,
// src served from the site root. Every entry is (re-)validated here through
// the same allow-lists parseTheme uses (family/weight/style allow-listed, src a
// `safePublicPath` with a woff2/woff extension) — so even a hand-built list
// cannot close a quote, a rule or the <style> tag. "" when there are no files.
export function fontFaceCss(files: readonly FontFile[]): string {
  return parseFontFiles(files)
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";src:url("/${f.src}") format("${fontFormat(f.src)}");` +
        `font-weight:${f.weight};font-style:${f.style};font-display:swap}`,
    )
    .join("\n");
}

function fontFormat(src: string): "woff2" | "woff" {
  return src.toLowerCase().endsWith(".woff2") ? "woff2" : "woff";
}

// The nav-pill, logo-width and `bar` header rules (v0.3.0+), and the v0.6.0
// design knobs. Each is emitted only when the theme opts into it; a config that
// sets none of them produces "" (byte-identical stylesheet).
function optionalCss(theme: ThemeCssInput, surface: ResolvedSurface): string {
  const parts: string[] = [];

  if ((theme.nav_links ?? []).some((l) => l.style === "pill")) {
    parts.push(
      `/* nav pill links (v0.3.0) */\n` +
        `.site-nav .nav-pill{border:1px solid currentColor;border-radius:30px;padding:6px 17px}`,
    );
  }

  if ((theme.nav_links ?? []).some((l) => l.type === "language_switch")) {
    parts.push(
      `/* language switch (v0.4.0) */\n` +
        `.site-nav .language-switch{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}\n` +
        // v0.6.1: every entry is a separate >= 44px tap target, and the current
        // language is marked (bold + accent underline; a filled pill in pill
        // style) instead of a dimmed color that read as "disabled".
        `.site-nav .language-switch a,.site-nav .language-switch [aria-current]{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}\n` +
        `[data-header] .site-nav .language-switch .nav-pill{min-height:36px;padding-top:0;padding-bottom:0}\n` +
        `.site-nav .language-switch [aria-current]{color:var(--ink);font-weight:700;text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:6px}\n` +
        `.site-nav .language-switch .nav-pill[aria-current]{background:var(--ink);color:var(--bg);border-color:var(--ink);text-decoration:none}`,
    );
  }

  if (theme.logo_width) {
    parts.push(
      `/* explicit logo width (v0.3.0) */\n` +
        `.site-header .logo{width:${theme.logo_width}px;height:auto}`,
    );
  }

  if (theme.hero) {
    // Index hero (v0.5.0): a raised panel on the page surface, heading in the
    // page ink, subtitle muted, CTA on the guarded accent (`.btn`). Text and
    // image stack on phones; a left-aligned hero with an image goes two-column
    // from 720px. Every color is a surface/accent token, so it follows a dark
    // surface automatically.
    parts.push(
      `/* index hero (v0.5.0) */\n` +
        `.index-hero{margin:28px 0 8px;padding:28px 22px;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);display:grid;gap:22px;align-items:center}\n` +
        `.index-hero h1{font-size:clamp(28px,7vw,42px);margin:0;overflow-wrap:anywhere}\n` +
        `.index-hero .index-hero-subtitle{color:var(--muted);font-size:19px;margin:10px 0 0;max-width:62ch}\n` +
        `.index-hero .index-hero-cta{margin:20px 0 0}\n` +
        `.index-hero .index-hero-image{display:block;width:100%;height:auto;max-height:420px;object-fit:cover;border-radius:var(--radius)}\n` +
        `.index-hero-center{text-align:center;justify-items:center}\n` +
        `.index-hero-center .index-hero-subtitle{margin-left:auto;margin-right:auto}\n` +
        `@media (min-width:720px){.index-hero{padding:40px 36px}.index-hero-left.index-hero-has-image{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}`,
    );
  }

  if (theme.header_variant === "bar") {
    // Full-bleed bar: logo left, nav right, surface-bg band, no accent tint.
    const logoShrink = theme.logo_width
      ? `\n@media (max-width:560px){[data-header="bar"] .site-header .logo{width:138px}}`
      : "";
    parts.push(
      `/* header variant: bar — full-bleed, logo left + nav right, surface bg (v0.3.0) */\n` +
        `[data-header="bar"] .site-header{background:var(--bg);border-bottom:1px solid var(--line);padding:21px 5%}\n` +
        // v0.6.1: the row and the nav wrap, so a phone with several nav entries
        // (plus a language pill) stacks the nav under the logo instead of
        // pushing the page sideways. Unchanged on a row that fits.
        `[data-header="bar"] .site-header .wrap{max-width:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 32px}\n` +
        `[data-header="bar"] .site-header .brand{align-items:center;margin:0}\n` +
        `[data-header="bar"] .site-nav{margin-top:0;gap:32px;font-size:15px;align-items:center;flex-wrap:wrap}\n` +
        `[data-header="bar"] .site-nav a{color:var(--ink);text-decoration:none;display:flex;align-items:center;min-height:44px}[data-header="bar"] .site-nav a.nav-pill{min-height:0}\n` +
        `[data-header="bar"] .site-nav a:hover{color:var(--ink);text-decoration:underline;text-underline-offset:6px}\n` +
        `@media (max-width:800px){[data-header="bar"] .site-header{padding:22px 6%}[data-header="bar"] .site-nav{gap:4px 16px;font-size:14px}}` +
        logoShrink,
    );
  }

  if (theme.post_back_link) {
    // "Back to all posts" breadcrumb above the post title (v0.9.0). Muted,
    // following `meta_color` when set (`var(--meta, var(--muted))`), no
    // underline until hover, a >= 32px tap target, and margin below. Colours
    // are surface tokens, so it reads on dark and light surfaces alike.
    parts.push(
      `/* post back link (v0.9.0) */\n` +
        `.post-back{margin:0 0 18px}\n` +
        `.post-back a{display:inline-flex;align-items:center;gap:6px;min-height:32px;color:var(--meta,var(--muted));font-size:14px;text-decoration:none}\n` +
        `.post-back a:hover{color:var(--meta,var(--muted));text-decoration:underline}`,
    );
  }

  parts.push(...designKnobCss(theme, surface));
  // v0.8.0 colour roles: [] when none is set. Appended BEFORE the fidelity
  // blocks so a non-accent `divider` (which also restyles `.accent-rule`) still
  // overrides the rule-colour block.
  parts.push(...colorRoleCss(theme, surface));
  // v0.7.0 fidelity keys: [] when none is set (byte-identical to v0.6.1).
  parts.push(...fidelityCss(theme, surface));

  // The base stylesheet already ends with one newline, so a single leading
  // newline here yields exactly one blank-line separator (the block style used
  // throughout the stylesheet).
  return parts.length ? `\n${parts.join("\n\n")}\n` : "";
}

// ---------------------------------------------------------------------------
// v0.8.0 colour roles
// ---------------------------------------------------------------------------

// Three roles that were hard-wired to the accent / muted token get their own
// optional colour. Each block is emitted ONLY when its key is set (so a config
// that sets none is byte-identical, and an absent key keeps the accent / muted
// colour), and re-points the role's selectors at a new variable:
//   - `--link`  the generic `<a>` colour: post-list title links, byline author
//     links, footer links and in-body links.
//   - `--rule`  the decorative accent bar under a page heading (`.accent-rule`).
//   - `--meta`  the metadata text (`.post-meta`): dates, bylines, reading time.
// `link_color` and `meta_color` carry text, so they are contrast-guarded to AA
// against the page background (as the accent is); `rule_color` is a decorative
// bar and is only re-serialized.
function colorRoleCss(theme: ThemeCssInput, s: ResolvedSurface): string[] {
  const parts: string[] = [];

  const link = normalizeHex(theme.link_color);
  if (link) {
    // Hover keeps the underline (a non-colour cue), so the link colour itself
    // need not change on hover to stay distinguishable.
    parts.push(
      `/* link colour (v0.8.0) */\n` +
        `:root{--link:${guardAccent(link, s.bg)}}\n` +
        `a{color:var(--link)}\n` +
        `a:hover{color:var(--link);text-decoration:underline}`,
    );
  }

  const rule = normalizeHex(theme.rule_color);
  if (rule) {
    parts.push(`/* rule colour (v0.8.0) */\n:root{--rule:${rule}}\n.accent-rule{background:var(--rule)}`);
  }

  const meta = normalizeHex(theme.meta_color);
  if (meta) {
    parts.push(`/* meta colour (v0.8.0) */\n:root{--meta:${guardAccent(meta, s.bg)}}\n.post-meta{color:var(--meta)}`);
  }

  return parts;
}

// ---------------------------------------------------------------------------
// v0.6.0 design knobs
// ---------------------------------------------------------------------------

function designKnobCss(theme: ThemeCssInput, s: ResolvedSurface): string[] {
  const parts: string[] = [];
  const spacing = safeLetterSpacing(theme.letter_spacing);
  const upper = `text-transform:uppercase${spacing ? `;letter-spacing:${spacing}` : ""}`;

  if (theme.post_list_variant === "cards") {
    const card = "[data-layout] .post-cards .post-card";
    parts.push(
      `/* post list: cards (v0.6.0) */\n` +
        `[data-layout] .post-list.post-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:20px;margin:28px 0}\n` +
        `${card}{position:relative;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:8px;margin:0;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);padding:22px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 20px -12px rgba(0,0,0,.28);transition:transform .15s ease,box-shadow .15s ease}\n` +
        `${card}:hover{transform:translateY(-2px);box-shadow:0 2px 4px rgba(0,0,0,.08),0 14px 28px -14px rgba(0,0,0,.34)}\n` +
        `${card}:focus-within{outline:2px solid var(--accent);outline-offset:2px}\n` +
        `${card} h2{font-size:21px;margin:0;line-height:1.25}\n` +
        `${card} h2 a{color:var(--ink)}\n` +
        `${card} h2 a::after{content:"";position:absolute;inset:0;border-radius:inherit}\n` +
        `${card} h2 a:focus{outline:none}\n` +
        `${card} .post-meta{margin:0}\n` +
        `${card} .excerpt{display:block;margin:0;font-size:16px;color:${s.softInk}}\n` +
        `${card} .post-card-byline a{position:relative;z-index:1}\n` +
        `${card} .post-card-cta{margin-top:auto;padding-top:6px;color:var(--accent);font-weight:600;font-size:15px}\n` +
        `@media (prefers-reduced-motion:reduce){${card}{transition:none}${card}:hover{transform:none}}`,
    );
  }

  // The v0.6.0 motif path unless a v0.7.0 motif key is set (./fidelity.ts).
  const pattern = motifCss(theme, s);
  if (pattern) parts.push(pattern);

  const weight = parseHeadingWeight(theme.heading_weight);
  if (weight) {
    parts.push(
      `/* heading weight (v0.6.0) */\n` + `h1,h2,h3,h4,[data-layout] .post-list h2,.post-faq dt{font-weight:${weight}}`,
    );
  }
  if (theme.heading_case === "uppercase") {
    parts.push(`/* heading case (v0.6.0) */\nh1,h2,h3,h4{${upper}}`);
  }
  if (theme.nav_case === "uppercase") {
    parts.push(`/* nav case (v0.6.0) */\n.site-nav{${upper}}`);
  }
  if (theme.logo_case === "uppercase") {
    parts.push(`/* logo case (v0.6.0) */\n.site-header .brand .name,.site-footer .footer-name{${upper}}`);
  }
  if (theme.meta_style === "mono") {
    const mono = safeFontStack(theme.mono_font) ?? DEFAULT_MONO_FONT;
    parts.push(
      `/* mono metadata (v0.6.0) */\n` +
        `.post-meta,.index-label,.index-hero .index-hero-eyebrow,.post-card-cta{font-family:${mono};font-size:13px;letter-spacing:.02em}`,
    );
  }

  if (theme.hero?.eyebrow) {
    parts.push(
      `/* hero eyebrow (v0.6.0) */\n` +
        `.index-hero .index-hero-eyebrow{margin:0 0 10px;color:var(--muted);font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}`,
    );
  }
  if (theme.index_label) {
    parts.push(
      `/* index label divider (v0.6.0) */\n` +
        `.index-label{display:flex;align-items:center;gap:14px;margin:34px 0 0;color:var(--muted);font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}\n` +
        `.index-label::after{content:"";flex:1;height:1px;background:var(--line)}\n` +
        `.index-label+.post-list{margin-top:14px}`,
    );
  }
  if (theme.logo_mark_key || theme.footer_tagline) {
    parts.push(
      `/* footer brand + tagline (v0.6.0) */\n` +
        `.site-footer .footer-brand{display:flex;align-items:center;gap:8px;margin:0 0 8px;color:var(--ink);font-family:var(--font-heading);font-weight:700;font-size:16px}\n` +
        `.site-footer .footer-tagline{margin:0 0 8px;color:var(--muted)}`,
    );
  }
  if (theme.logo_mark_key) {
    parts.push(
      `/* logo mark (v0.6.0) */\n` +
        `.site-header .brand>a{display:inline-flex;align-items:center;gap:10px}\n` +
        `.logo-mark{display:block;height:28px;width:auto}\n` +
        `.site-footer .logo-mark{height:22px}`,
    );
  }

  if (theme.drop_cap) {
    const first =
      `html:not([dir="rtl"]) .post-body>p:first-of-type::first-letter,` +
      `html:not([dir="rtl"]) .post-body>article>p:first-of-type::first-letter`;
    parts.push(
      `/* drop cap (v0.6.0) */\n` +
        `${first}{float:left;font-family:var(--font-heading);font-size:3.4em;line-height:.85;font-weight:700;color:var(--accent);margin:.06em .1em 0 0}`,
    );
  }
  if (theme.list_marker === "dash") {
    parts.push(
      `/* list marker: dash (v0.6.0) */\n` +
        `.post-body ul{list-style:none;padding-inline-start:1.4em}\n` +
        `.post-body ul>li{position:relative}\n` +
        `.post-body ul>li::before{content:"\\2013";position:absolute;inset-inline-start:-1.3em;color:var(--muted)}`,
    );
  } else if (theme.list_marker === "accent") {
    parts.push(`/* list marker: accent (v0.6.0) */\n.post-body li::marker{color:var(--accent)}`);
  }
  if (theme.heading_accent) {
    parts.push(
      `/* heading accent tick (v0.6.0) */\n` +
        `.post-body h2::before{content:"";display:block;width:32px;height:3px;margin:0 0 12px;background:var(--accent);border-radius:2px}`,
    );
  }

  if (theme.header_align === "content") {
    // Constrain the header row to the content column (.wrap). The non-bar
    // variants already sit on it; this pulls the full-bleed `bar` in. On a
    // phone the column is narrow, so the nav wraps under the brand instead of
    // pushing the page sideways.
    parts.push(
      `/* header aligned to the content column (v0.6.0) */\n` +
        `[data-header] .site-header .wrap{max-width:820px;margin:0 auto;padding:0 20px;flex-wrap:wrap;row-gap:12px}\n` +
        `[data-header="bar"] .site-header{padding-left:0;padding-right:0}`,
    );
  }
  return parts;
}
