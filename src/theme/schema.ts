// The theme values file (`config/theme.json`) — one per customer repo.
//
// The keys are the SAME snake_case keys the API stores for a blog theme
// (`hosted_blog_sites.theme`, written by `HostedBlogs::UpdateTheme`, whitelisted
// by the controller's THEME_KEYS). The API writes this file verbatim when a
// customer saves their theme, so do not rename a key here without changing
// `CustomerBlogs::ThemeFile` in the API in the same release.
//
// `palette` always carries RESOLVED hexes (the API resolves a preset id to its
// hexes at save time); `kind` / `preset_id` ride along for the editor and are
// ignored by rendering.

export type LayoutVariant = "journal" | "grid" | "minimal";
// Header and post-page layouts each have three options, independent of the
// post-list `layout_variant`. Together (3 × 3 × 3) plus the palette, fonts,
// radius/spacing and class prefix they let each site carry its own look and
// markup rather than every site rendering the identical default.
// "bar" is a full-bleed header (logo left, nav right, surface-bg band) added in
// v0.3.0 for sites matching an existing brand site's chrome. The first three are
// unchanged from v0.2.0.
export type HeaderVariant = "classic" | "centered" | "compact" | "bar";
export type PostVariant = "classic" | "wide" | "narrow";
export type SchemaVariant = "Article" | "BlogPosting";
// A post may override the site default with "Review" — a comparison / product
// review emits schema.org Review instead of Article/BlogPosting. The theme
// default stays Article|BlogPosting (a whole site is not "a review"); "Review"
// is a per-post choice only, so it lives in its own wider union.
export type PostSchemaVariant = SchemaVariant | "Review";

export interface ThemePalette {
  kind?: string;
  preset_id?: string;
  primary: string;
  secondary: string | null;
}

// Custom font stacks. When a stack is set it overrides the `font_pair` preset
// for that slot; null falls back to the preset. Lets a site pick its own type
// without being limited to the preset pairs.
export interface ThemeFonts {
  heading: string | null;
  body: string | null;
}

// Page-surface colors (v0.3.0). Four raw hexes carried the same way `palette`
// carries its primary/secondary — stored verbatim here and RE-VALIDATED (and
// AA-checked) in the palette/css layer before any value reaches CSS. When a
// `surface` is set the page bg/ink/muted/line come from it instead of the
// hard-coded light defaults, letting a site match a dark brand site; when it is
// absent or fails validation the page keeps the exact v0.2.0 light surface.
export interface ThemeSurface {
  bg: string;
  ink: string;
  muted: string;
  line: string;
}

// A header nav entry (v0.3.0). When `nav_links` is non-empty it REPLACES the
// default Home/About/Authors nav. Two kinds (v0.4.0 adds the second):
//   - `type: "link"` (the default when `type` is absent) — a plain link. `href`
//     is always `/`-relative or `https://` (validated at parse time — never
//     `javascript:`/`data:`); `label` is plain text, <= 30 chars.
//   - `type: "language_switch"` — renders the language switcher (links/pill to
//     the languages the site publishes, or a post's siblings). It carries no
//     `label`/`href`; the switcher content is computed at build time and hidden
//     when the site has a single language.
// `style: "pill"` renders links as bordered pills (both kinds).
export type NavLinkStyle = "pill";
export type NavLinkType = "link" | "language_switch";
export interface NavLink {
  type: NavLinkType;
  label: string;
  href: string;
  style: NavLinkStyle | null;
}

// Optional blog-index hero block (v0.5.0). When set, page 1 of the index opens
// with a `<section>` carrying the hero `<h1>` (in place of the brand-name
// heading — the page still has exactly one h1), an optional subtitle, an
// optional call-to-action button and an optional image. Null = no hero (the
// index renders exactly as before).
//   - `title` is required plain text (<= HERO_TITLE_MAX chars) — without it the
//     whole hero is dropped.
//   - `subtitle` is optional plain text (<= HERO_SUBTITLE_MAX chars).
//   - `image_key` is a path under the site's `public/` dir (served at the site
//     root), validated by `safePublicPath` with an image extension. Invalid =
//     no image (the hero still renders). `image_alt` is its alt text ("" =
//     decorative).
//   - `cta` needs both a plain-text `label` (<= HERO_CTA_LABEL_MAX) and an
//     `href` that passes `isSafeNavHref`; otherwise the button is dropped.
//   - `align` is "left" (default) or "center".
export type HeroAlign = "left" | "center";
export interface ThemeHeroCta {
  label: string;
  href: string;
}
export interface ThemeHero {
  // Optional small text above the title (v0.6.0), plain text <= HERO_EYEBROW_MAX.
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  image_key: string | null;
  image_alt: string;
  cta: ThemeHeroCta | null;
  align: HeroAlign;
}

// A self-hosted font file (v0.5.0). Each valid entry emits one `@font-face`
// rule (font-display: swap) whose src is the file served from the site's own
// `public/` dir — no third-party font origin. The family is then used by
// naming it in `fonts.heading` / `fonts.body` (e.g. `"Example Sans", sans-serif`).
//   - `family`: letters/digits/spaces/hyphens/underscores only (<= 60 chars).
//   - `src`: a relative path under `public/` ending in `.woff2` or `.woff`
//     (`safePublicPath`: no `..`, no scheme, no `//`, no CSS-significant chars).
//   - `weight`: "100".."900" in steps of 100, "normal", "bold", or a variable
//     range like "100 900". Default "400".
//   - `style`: "normal" (default) or "italic".
// Invalid entries are dropped individually; the list is capped at
// FONT_FILES_MAX.
export type FontFileStyle = "normal" | "italic";
export interface FontFile {
  family: string;
  src: string;
  weight: string;
  style: FontFileStyle;
}

// v0.6.0 design knobs. Every one is optional and defaults to the v0.5.0 look,
// so a config that sets none of them renders byte-identically.
//   - `post_list_variant`: "list" (the existing layout-variant list) or
//     "cards" (raised cards: date, reading time, title, excerpt, byline and a
//     "Read →" affordance whose text is `post_list_cta_label`).
//   - `pattern`: a pure-CSS background motif behind the index hero and the post
//     header, drawn in an accent-tinted color that is contrast-checked against
//     the page ink/muted text; `pattern_image_key` (svg/png/webp under
//     `public/`) supplies a custom motif instead, under a surface-colored veil.
//   - typography: `heading_weight` (300-900), `heading_case` / `nav_case` /
//     `logo_case` ("uppercase" with the shared `letter_spacing`), and
//     `meta_style: "mono"` (small labels/metadata in `mono_font`).
//   - labels: `index_label` (a divider above the index post list) and
//     `footer_tagline`; the hero carries an optional `eyebrow`.
//   - post body: `drop_cap`, `list_marker`, `heading_accent`.
//   - `date_format`: "iso" (YYYY-MM-DD) or "long" (Intl, page language, UTC).
//   - `logo_mark_key`: a small image before the text wordmark (header + footer).
//   - `header_align`: "full" or "content" (header row on the content column).
export type PostListVariant = "list" | "cards";
export type PatternVariant = "none" | "dots" | "grid" | "pinstripe" | "herringbone";
export type TextCase = "none" | "uppercase";
export type MetaStyle = "default" | "mono";
export type ListMarker = "default" | "dash" | "accent";
export type DateFormat = "iso" | "long";
export type HeaderAlign = "full" | "content";

export interface ThemeConfig {
  brand_name: string;
  tagline: string | null;
  accent_color: string | null;
  palette: ThemePalette | null;
  font_pair: string;
  fonts: ThemeFonts;
  layout_variant: LayoutVariant;
  header_variant: HeaderVariant;
  post_variant: PostVariant;
  schema_variant: SchemaVariant;
  // Base corner radius (a CSS length, e.g. "8px" or "0"); drives the `--radius`
  // token used by cards, buttons and images.
  radius: string;
  // Vertical-rhythm base (a CSS length, e.g. "18px"); drives the `--space`
  // token used by post-body spacing and section gaps.
  space: string;
  // Per-site class namespace (see ./classes.ts). "" = no prefix.
  class_prefix: string;
  // Optional page-surface colors (see ThemeSurface). Null = the v0.2.0 light
  // surface (white bg / near-black ink).
  surface: ThemeSurface | null;
  // Optional header nav links; [] = the default Home/About/Authors nav.
  nav_links: NavLink[];
  // Optional explicit header-logo width in px (60-320). Null = the default
  // 40px-tall logo. When set the logo renders at this width with height:auto.
  logo_width: number | null;
  // Optional target for the header logo / brand link (v0.4.0). Validated like a
  // nav href (`/`-relative or `https://` only). Null = the default `/` (home).
  // An external `https://` target gets rel="noopener".
  logo_href: string | null;
  // A path under the repo's `public/` dir (e.g. "images/logo.png"), served at
  // the site root. Null = render the brand name as text.
  logo_key: string | null;
  about_text: string | null;
  contact_email: string | null;
  // Optional index hero (v0.5.0, see ThemeHero). Null = no hero.
  hero: ThemeHero | null;
  // Optional self-hosted font files (v0.5.0, see FontFile). [] = none (fonts
  // come only from the `font_pair` / `fonts` system stacks, as before).
  font_files: FontFile[];
  // v0.6.0 design knobs (see the PostListVariant comment above).
  post_list_variant: PostListVariant;
  // The card CTA text; null = DEFAULT_POST_LIST_CTA_LABEL.
  post_list_cta_label: string | null;
  pattern: PatternVariant;
  // A path under `public/` (svg/png/webp). When set it is the motif (it wins
  // over `pattern`).
  pattern_image_key: string | null;
  // 300-900 in steps of 100; null = the browser's default heading weight.
  heading_weight: number | null;
  heading_case: TextCase;
  nav_case: TextCase;
  logo_case: TextCase;
  // A CSS length applied as letter-spacing wherever a `*_case` is uppercase;
  // null = no extra tracking.
  letter_spacing: string | null;
  meta_style: MetaStyle;
  // A font stack (validated like `fonts`); null = DEFAULT_MONO_FONT.
  mono_font: string | null;
  index_label: string | null;
  footer_tagline: string | null;
  drop_cap: boolean;
  list_marker: ListMarker;
  heading_accent: boolean;
  date_format: DateFormat;
  logo_mark_key: string | null;
  header_align: HeaderAlign;
}

export const LAYOUT_VARIANTS: readonly LayoutVariant[] = ["journal", "grid", "minimal"];
export const HEADER_VARIANTS: readonly HeaderVariant[] = ["classic", "centered", "compact", "bar"];
export const POST_VARIANTS: readonly PostVariant[] = ["classic", "wide", "narrow"];
export const SCHEMA_VARIANTS: readonly SchemaVariant[] = ["Article", "BlogPosting"];
export const POST_SCHEMA_VARIANTS: readonly PostSchemaVariant[] = ["Article", "BlogPosting", "Review"];
export const DEFAULT_LAYOUT: LayoutVariant = "journal";
export const DEFAULT_HEADER_VARIANT: HeaderVariant = "classic";
export const DEFAULT_POST_VARIANT: PostVariant = "classic";
export const DEFAULT_SCHEMA_VARIANT: SchemaVariant = "BlogPosting";
export const DEFAULT_FONT_PAIR = "editorial";
export const DEFAULT_RADIUS = "8px";
export const DEFAULT_SPACE = "18px";
export const NAV_LINKS_MAX = 6;
export const NAV_LABEL_MAX = 30;
export const NAV_LINK_TYPES: readonly NavLinkType[] = ["link", "language_switch"];
export const LOGO_WIDTH_MIN = 60;
export const LOGO_WIDTH_MAX = 320;
export const HERO_ALIGNS: readonly HeroAlign[] = ["left", "center"];
export const DEFAULT_HERO_ALIGN: HeroAlign = "left";
export const HERO_TITLE_MAX = 120;
export const HERO_SUBTITLE_MAX = 300;
export const HERO_CTA_LABEL_MAX = 40;
export const HERO_IMAGE_ALT_MAX = 200;
export const HERO_IMAGE_EXTENSIONS: readonly string[] = ["png", "jpg", "jpeg", "webp", "avif", "gif", "svg"];
export const FONT_FILES_MAX = 12;
export const FONT_FILE_EXTENSIONS: readonly string[] = ["woff2", "woff"];
export const FONT_FILE_STYLES: readonly FontFileStyle[] = ["normal", "italic"];
export const DEFAULT_FONT_WEIGHT = "400";
export const DEFAULT_FONT_STYLE: FontFileStyle = "normal";
export const HERO_EYEBROW_MAX = 60;
export const POST_LIST_VARIANTS: readonly PostListVariant[] = ["list", "cards"];
export const DEFAULT_POST_LIST_VARIANT: PostListVariant = "list";
export const POST_LIST_CTA_LABEL_MAX = 30;
export const DEFAULT_POST_LIST_CTA_LABEL = "Read \u2192";
export const PATTERN_VARIANTS: readonly PatternVariant[] = ["none", "dots", "grid", "pinstripe", "herringbone"];
export const DEFAULT_PATTERN: PatternVariant = "none";
export const PATTERN_IMAGE_EXTENSIONS: readonly string[] = ["svg", "png", "webp"];
export const HEADING_WEIGHT_MIN = 300;
export const HEADING_WEIGHT_MAX = 900;
export const TEXT_CASES: readonly TextCase[] = ["none", "uppercase"];
export const DEFAULT_TEXT_CASE: TextCase = "none";
export const META_STYLES: readonly MetaStyle[] = ["default", "mono"];
export const DEFAULT_META_STYLE: MetaStyle = "default";
export const DEFAULT_MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
export const INDEX_LABEL_MAX = 40;
export const FOOTER_TAGLINE_MAX = 120;
export const LIST_MARKERS: readonly ListMarker[] = ["default", "dash", "accent"];
export const DEFAULT_LIST_MARKER: ListMarker = "default";
export const DATE_FORMATS: readonly DateFormat[] = ["iso", "long"];
export const DEFAULT_DATE_FORMAT: DateFormat = "iso";
export const LOGO_MARK_EXTENSIONS: readonly string[] = HERO_IMAGE_EXTENSIONS;
export const HEADER_ALIGNS: readonly HeaderAlign[] = ["full", "content"];
export const DEFAULT_HEADER_ALIGN: HeaderAlign = "full";

const optionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

function parsePalette(value: unknown): ThemePalette | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const primary = optionalString(raw.primary);
  if (!primary) return null;
  return {
    kind: optionalString(raw.kind) ?? undefined,
    preset_id: optionalString(raw.preset_id) ?? undefined,
    primary,
    secondary: optionalString(raw.secondary),
  };
}

// Surface colors are stored raw (like the palette), then re-validated as hexes
// and AA-checked in the css/palette layer. All four must be present strings or
// the whole surface is dropped (fall back to the light default).
function parseSurface(value: unknown): ThemeSurface | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const bg = optionalString(raw.bg);
  const ink = optionalString(raw.ink);
  const muted = optionalString(raw.muted);
  const line = optionalString(raw.line);
  if (!bg || !ink || !muted || !line) return null;
  return { bg, ink, muted, line };
}

// A nav href is only allowed to be `/`-relative (a single leading slash, never
// protocol-relative `//`) or an absolute `https://` URL. Everything else —
// `javascript:`, `data:`, bare `http://`, mailto:, fragments — is rejected so a
// values file can never inject a dangerous link.
export function isSafeNavHref(href: string): boolean {
  if (href.startsWith("https://")) return href.length > "https://".length;
  return href.startsWith("/") && !href.startsWith("//");
}

function parseNavLink(value: unknown): NavLink | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const style = raw.style === "pill" ? "pill" : null;

  // A language_switch entry carries no label/href — the switcher content is
  // computed at build time. Everything else is a plain link (the default when
  // `type` is absent), which still requires a safe href + a <= 30-char label.
  if (raw.type === "language_switch") {
    return { type: "language_switch", label: "", href: "", style };
  }
  const label = optionalString(raw.label);
  if (!label || label.length > NAV_LABEL_MAX) return null;
  const href = optionalString(raw.href);
  if (!href || !isSafeNavHref(href)) return null;
  return { type: "link", label, href, style };
}

// Parse the nav links: each entry is validated independently (invalid ones are
// dropped), and the list is capped at NAV_LINKS_MAX. [] when absent or when
// nothing valid survives, so the default nav renders.
function parseNavLinks(value: unknown): NavLink[] {
  if (!Array.isArray(value)) return [];
  const links: NavLink[] = [];
  for (const entry of value) {
    const link = parseNavLink(entry);
    if (link) links.push(link);
    if (links.length >= NAV_LINKS_MAX) break;
  }
  return links;
}

// The header logo / brand link target. Validated exactly like a nav href
// (`/`-relative or `https://` only, never `javascript:`/`data:`/`http:`/`//`);
// anything else — including a blank value — falls back to null (the default
// `/`), so a bad value can never inject a dangerous link.
function parseLogoHref(value: unknown): string | null {
  const href = optionalString(value);
  return href && isSafeNavHref(href) ? href : null;
}

// An explicit logo width must be an integer px in [LOGO_WIDTH_MIN, MAX]; a
// numeric string is accepted. Anything else (non-integer, out of range) falls
// back to null (the default 40px-tall logo).
function parseLogoWidth(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n)) return null;
  if (n < LOGO_WIDTH_MIN || n > LOGO_WIDTH_MAX) return null;
  return n;
}

// A path to a file served from the site's own `public/` dir (v0.5.0). Used for
// font-file `src` (interpolated into a <style> block) and hero `image_key`, so
// it is validated strictly rather than escaped:
//   - one optional leading `/` is tolerated and stripped; any further leading
//     `/` (protocol-relative `//`) is rejected;
//   - only letters, digits, `.`, `_`, `-` and `/` — so no scheme (`:`), no
//     quotes, parens, spaces, `;`, `{}`, `<>`, `\`, `%`, `?` or `#` that could
//     break out of a CSS `url("…")` or point off-site;
//   - no empty, `.` or `..` path segment (no traversal);
//   - the extension (case-insensitive) must be one of `extensions`.
// Returns the normalized path (no leading slash) or null.
export const PUBLIC_PATH_MAX = 200;
const PUBLIC_PATH_RE = /^[A-Za-z0-9_-][A-Za-z0-9._/-]*$/;

export function safePublicPath(value: unknown, extensions: readonly string[]): string | null {
  const raw = optionalString(value);
  if (!raw) return null;
  const path = raw.startsWith("/") ? raw.slice(1) : raw;
  if (path.length === 0 || path.length > PUBLIC_PATH_MAX || !PUBLIC_PATH_RE.test(path)) return null;
  const segments = path.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) return null;
  const last = segments[segments.length - 1] ?? "";
  const dot = last.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = last.slice(dot + 1).toLowerCase();
  return extensions.includes(ext) ? path : null;
}

// Plain text bounded to `max` chars (after trim); anything else is null.
function boundedText(value: unknown, max: number): string | null {
  const v = optionalString(value);
  return v && v.length <= max ? v : null;
}

function parseHeroCta(value: unknown): ThemeHeroCta | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const label = boundedText(raw.label, HERO_CTA_LABEL_MAX);
  const href = optionalString(raw.href);
  if (!label || !href || !isSafeNavHref(href)) return null;
  return { label, href };
}

// The index hero. A missing / over-long title drops the whole hero (null = the
// index renders as before); every other field degrades on its own.
export function parseHero(value: unknown): ThemeHero | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const title = boundedText(raw.title, HERO_TITLE_MAX);
  if (!title) return null;
  return {
    eyebrow: boundedText(raw.eyebrow, HERO_EYEBROW_MAX),
    title,
    subtitle: boundedText(raw.subtitle, HERO_SUBTITLE_MAX),
    image_key: safePublicPath(raw.image_key, HERO_IMAGE_EXTENSIONS),
    image_alt: boundedText(raw.image_alt, HERO_IMAGE_ALT_MAX) ?? "",
    cta: parseHeroCta(raw.cta),
    align: HERO_ALIGNS.find((a) => a === raw.align) ?? DEFAULT_HERO_ALIGN,
  };
}

// A font family name is quoted into CSS, so it is restricted to characters that
// can never close the quote or the rule.
const FONT_FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,59}$/;
// A single weight (100-900 in steps of 100, normal, bold) or a variable-font
// range "<lo> <hi>" with lo <= hi.
const FONT_WEIGHT_RE = /^(normal|bold|[1-9]00|[1-9]00 [1-9]00)$/;

function parseFontWeight(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return DEFAULT_FONT_WEIGHT;
  const v = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!FONT_WEIGHT_RE.test(v)) return null;
  const parts = v.split(" ");
  if (parts.length === 2 && Number(parts[0]) > Number(parts[1])) return null;
  return v;
}

function parseFontFile(value: unknown): FontFile | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const family = optionalString(raw.family);
  if (!family || !FONT_FAMILY_RE.test(family)) return null;
  const src = safePublicPath(raw.src, FONT_FILE_EXTENSIONS);
  if (!src) return null;
  const weight = parseFontWeight(raw.weight);
  if (!weight) return null;
  const style = raw.style === undefined || raw.style === null ? DEFAULT_FONT_STYLE : FONT_FILE_STYLES.find((s) => s === raw.style);
  if (!style) return null;
  return { family, src, weight, style };
}

// Self-hosted font files: each entry validated independently (invalid ones are
// dropped), capped at FONT_FILES_MAX. [] when absent.
export function parseFontFiles(value: unknown): FontFile[] {
  if (!Array.isArray(value)) return [];
  const files: FontFile[] = [];
  for (const entry of value) {
    const file = parseFontFile(entry);
    if (file) files.push(file);
    if (files.length >= FONT_FILES_MAX) break;
  }
  return files;
}

// Validate + normalize a raw theme.json. `brand_name` is the one required key
// (it is the site's visible name and the JSON-LD publisher); an unknown enum
// value falls back to its default rather than failing the build, because the
// palette/layout are cosmetic. Colors are NOT trusted here — the palette module
// re-validates every hex before it reaches CSS.
export function parseTheme(raw: unknown): ThemeConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[theme] config/theme.json must be a JSON object");
  }
  const t = raw as Record<string, unknown>;
  const brandName = optionalString(t.brand_name);
  if (!brandName) {
    throw new Error("[theme] config/theme.json is missing required key 'brand_name'");
  }
  const layout = LAYOUT_VARIANTS.find((v) => v === t.layout_variant) ?? DEFAULT_LAYOUT;
  const header = HEADER_VARIANTS.find((v) => v === t.header_variant) ?? DEFAULT_HEADER_VARIANT;
  const post = POST_VARIANTS.find((v) => v === t.post_variant) ?? DEFAULT_POST_VARIANT;
  const schema = SCHEMA_VARIANTS.find((v) => v === t.schema_variant) ?? DEFAULT_SCHEMA_VARIANT;
  const fontsRaw = typeof t.fonts === "object" && t.fonts !== null ? (t.fonts as Record<string, unknown>) : {};

  return {
    brand_name: brandName,
    tagline: optionalString(t.tagline),
    accent_color: optionalString(t.accent_color),
    palette: parsePalette(t.palette),
    font_pair: optionalString(t.font_pair) ?? DEFAULT_FONT_PAIR,
    fonts: { heading: safeFontStack(fontsRaw.heading), body: safeFontStack(fontsRaw.body) },
    layout_variant: layout,
    header_variant: header,
    post_variant: post,
    schema_variant: schema,
    radius: safeLength(t.radius) ?? DEFAULT_RADIUS,
    space: safeLength(t.space) ?? DEFAULT_SPACE,
    class_prefix: slugPrefix(optionalString(t.class_prefix)),
    surface: parseSurface(t.surface),
    nav_links: parseNavLinks(t.nav_links),
    logo_width: parseLogoWidth(t.logo_width),
    logo_href: parseLogoHref(t.logo_href),
    logo_key: optionalString(t.logo_key),
    about_text: optionalString(t.about_text),
    contact_email: optionalString(t.contact_email),
    hero: parseHero(t.hero),
    font_files: parseFontFiles(t.font_files),
    post_list_variant: oneOf(POST_LIST_VARIANTS, t.post_list_variant, DEFAULT_POST_LIST_VARIANT),
    post_list_cta_label: boundedText(t.post_list_cta_label, POST_LIST_CTA_LABEL_MAX),
    pattern: oneOf(PATTERN_VARIANTS, t.pattern, DEFAULT_PATTERN),
    pattern_image_key: safePublicPath(t.pattern_image_key, PATTERN_IMAGE_EXTENSIONS),
    heading_weight: parseHeadingWeight(t.heading_weight),
    heading_case: oneOf(TEXT_CASES, t.heading_case, DEFAULT_TEXT_CASE),
    nav_case: oneOf(TEXT_CASES, t.nav_case, DEFAULT_TEXT_CASE),
    logo_case: oneOf(TEXT_CASES, t.logo_case, DEFAULT_TEXT_CASE),
    letter_spacing: safeLetterSpacing(t.letter_spacing),
    meta_style: oneOf(META_STYLES, t.meta_style, DEFAULT_META_STYLE),
    mono_font: safeFontStack(t.mono_font),
    index_label: boundedText(t.index_label, INDEX_LABEL_MAX),
    footer_tagline: boundedText(t.footer_tagline, FOOTER_TAGLINE_MAX),
    drop_cap: t.drop_cap === true,
    list_marker: oneOf(LIST_MARKERS, t.list_marker, DEFAULT_LIST_MARKER),
    heading_accent: t.heading_accent === true,
    date_format: oneOf(DATE_FORMATS, t.date_format, DEFAULT_DATE_FORMAT),
    logo_mark_key: safePublicPath(t.logo_mark_key, LOGO_MARK_EXTENSIONS),
    header_align: oneOf(HEADER_ALIGNS, t.header_align, DEFAULT_HEADER_ALIGN),
  };
}

// An allow-listed enum value, or the default for anything else (including a
// wrong type) — an invalid knob is dropped on its own, never thrown.
function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.find((v) => v === value) ?? fallback;
}

// A heading weight is an integer 300-900 in steps of 100 (a numeric string is
// accepted); anything else is null (the default weight).
export function parseHeadingWeight(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isInteger(n) || n % 100 !== 0) return null;
  return n >= HEADING_WEIGHT_MIN && n <= HEADING_WEIGHT_MAX ? n : null;
}

// A class prefix must be a safe class-name fragment (letters/digits/hyphens):
// it is concatenated into both markup class names and stylesheet selectors, so
// anything else is dropped rather than allowed to break a selector. "" when
// absent or fully invalid.
function slugPrefix(value: string | null): string {
  if (!value) return "";
  const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return /^[a-z]/.test(cleaned) ? cleaned : "";
}

// Theme values are interpolated into a <style> block, so anything that is not
// plainly a font list or a CSS length is dropped (falls back to the default)
// rather than escaped: a values file can never inject CSS or close the tag.
const FONT_STACK_RE = /^[A-Za-z0-9 ,"'-]{1,200}$/;
const LENGTH_RE = /^(0|\d{1,3}(\.\d{1,3})?(px|rem|em))$/;

export function safeFontStack(value: unknown): string | null {
  const v = optionalString(value);
  return v && FONT_STACK_RE.test(v) ? v : null;
}

export function safeLength(value: unknown): string | null {
  const v = optionalString(value);
  return v && LENGTH_RE.test(v) ? v : null;
}

// Letter-spacing (v0.6.0): `0`, or an optionally negative length in em/rem/px
// with at most two integer digits and three decimals ("0.04em", "-0.5px",
// ".1em"). Interpolated into the stylesheet, so it is allow-listed by pattern —
// nothing else (no `;`, `}`, units like `vw`, or keywords) can get through.
const LETTER_SPACING_RE = /^(0|-?(\d{1,2}(\.\d{1,3})?|\.\d{1,3})(em|rem|px))$/;

export function safeLetterSpacing(value: unknown): string | null {
  const v = optionalString(value);
  return v && LETTER_SPACING_RE.test(v) ? v : null;
}
