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
export type SchemaVariant = "Article" | "BlogPosting";

export interface ThemePalette {
  kind?: string;
  preset_id?: string;
  primary: string;
  secondary: string | null;
}

export interface ThemeConfig {
  brand_name: string;
  tagline: string | null;
  accent_color: string | null;
  palette: ThemePalette | null;
  font_pair: string;
  layout_variant: LayoutVariant;
  schema_variant: SchemaVariant;
  // A path under the repo's `public/` dir (e.g. "images/logo.png"), served at
  // the site root. Null = render the brand name as text.
  logo_key: string | null;
  about_text: string | null;
  contact_email: string | null;
}

export const LAYOUT_VARIANTS: readonly LayoutVariant[] = ["journal", "grid", "minimal"];
export const SCHEMA_VARIANTS: readonly SchemaVariant[] = ["Article", "BlogPosting"];
export const DEFAULT_LAYOUT: LayoutVariant = "journal";
export const DEFAULT_SCHEMA_VARIANT: SchemaVariant = "BlogPosting";
export const DEFAULT_FONT_PAIR = "editorial";

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
  const schema = SCHEMA_VARIANTS.find((v) => v === t.schema_variant) ?? DEFAULT_SCHEMA_VARIANT;

  return {
    brand_name: brandName,
    tagline: optionalString(t.tagline),
    accent_color: optionalString(t.accent_color),
    palette: parsePalette(t.palette),
    font_pair: optionalString(t.font_pair) ?? DEFAULT_FONT_PAIR,
    layout_variant: layout,
    schema_variant: schema,
    logo_key: optionalString(t.logo_key),
    about_text: optionalString(t.about_text),
    contact_email: optionalString(t.contact_email),
  };
}
