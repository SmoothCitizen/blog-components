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
export type HeaderVariant = "classic" | "centered" | "compact";
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
  // A path under the repo's `public/` dir (e.g. "images/logo.png"), served at
  // the site root. Null = render the brand name as text.
  logo_key: string | null;
  about_text: string | null;
  contact_email: string | null;
}

export const LAYOUT_VARIANTS: readonly LayoutVariant[] = ["journal", "grid", "minimal"];
export const HEADER_VARIANTS: readonly HeaderVariant[] = ["classic", "centered", "compact"];
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
    logo_key: optionalString(t.logo_key),
    about_text: optionalString(t.about_text),
    contact_email: optionalString(t.contact_email),
  };
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
