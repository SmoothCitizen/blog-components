// The blog stylesheet: layout variant x font pair x palette, plus typography
// for post bodies and the FAQ block. Fonts are self-contained system stacks (no
// external font fetch, so no third-party origin on any page). Every color token
// comes from palette.ts, which validates and re-serializes each hex, so a theme
// value can never inject arbitrary CSS.

import { prefixStylesheet } from "./classes";
import { AA_CONTRAST, contrastRatio, mix, normalizeHex, paletteCssVars, relativeLuminance, type PaletteSource } from "./palette";
import {
  DEFAULT_FONT_PAIR,
  DEFAULT_LAYOUT,
  DEFAULT_RADIUS,
  DEFAULT_SPACE,
  LAYOUT_VARIANTS,
  type ThemeConfig,
  type ThemeSurface,
} from "./schema";

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

type ThemeCssInput = PaletteSource &
  Pick<ThemeConfig, "font_pair"> &
  Partial<
    Pick<
      ThemeConfig,
      "fonts" | "radius" | "space" | "class_prefix" | "header_variant" | "post_variant" | "surface" | "nav_links" | "logo_width"
    >
  >;

// The page-level colors, resolved. When a surface is absent (or fails
// validation) these are the EXACT v0.2.0 literals, so themeCss is byte-identical
// for a v0.2.0 config. `panel` and `softInk` are literal defaults too (they map
// to the hard-coded `#f6f7f9` / `#333` the stylesheet used before); for a custom
// surface they are derived from it so dark pages get dark panels / dim ink.
interface ResolvedSurface {
  bg: string;
  ink: string;
  muted: string;
  line: string;
  panel: string;
  softInk: string;
  dark: boolean;
}

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
  const extra = optionalCss(theme);
  const full = extra ? `${css}${extra}` : css;
  return prefixStylesheet(full.trim(), theme.class_prefix);
}

// The nav-pill, logo-width and `bar` header rules. Each is emitted only when the
// theme opts into it; a v0.2.0 config produces "".
function optionalCss(theme: ThemeCssInput): string {
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
        `.site-nav .language-switch{display:inline-flex;gap:12px;align-items:center}\n` +
        `.site-nav .language-switch [aria-current]{color:var(--muted);text-decoration:none}`,
    );
  }

  if (theme.logo_width) {
    parts.push(
      `/* explicit logo width (v0.3.0) */\n` +
        `.site-header .logo{width:${theme.logo_width}px;height:auto}`,
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
        `[data-header="bar"] .site-header .wrap{max-width:none;margin:0;padding:0;display:flex;justify-content:space-between;align-items:center;gap:32px}\n` +
        `[data-header="bar"] .site-header .brand{align-items:center;margin:0}\n` +
        `[data-header="bar"] .site-nav{margin-top:0;gap:32px;font-size:15px;align-items:center}\n` +
        `[data-header="bar"] .site-nav a{color:var(--ink);text-decoration:none;display:flex;align-items:center;min-height:44px}[data-header="bar"] .site-nav a.nav-pill{min-height:0}\n` +
        `[data-header="bar"] .site-nav a:hover{color:var(--ink);text-decoration:underline;text-underline-offset:6px}\n` +
        `@media (max-width:800px){[data-header="bar"] .site-header{padding:22px 6%}[data-header="bar"] .site-nav{gap:16px;font-size:14px}}` +
        logoShrink,
    );
  }

  // The base stylesheet already ends with one newline, so a single leading
  // newline here yields exactly one blank-line separator (the block style used
  // throughout the stylesheet).
  return parts.length ? `\n${parts.join("\n\n")}\n` : "";
}
