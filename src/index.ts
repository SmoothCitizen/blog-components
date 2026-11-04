// Public API of the blog components package. Filesystem code lives in the
// separate "./content" entry (Node only).

export { parseTheme, DEFAULT_FONT_PAIR, DEFAULT_LAYOUT, DEFAULT_SCHEMA_VARIANT, LAYOUT_VARIANTS, SCHEMA_VARIANTS } from "./theme/schema";
export type { LayoutVariant, SchemaVariant, ThemeConfig, ThemePalette } from "./theme/schema";
export { FONT_PAIRS, resolveFont, resolveLayout, themeCss } from "./theme/css";
export { derivePalette, contrastRatio, guardAccent, normalizeHex, paletteCssVars, AA_CONTRAST } from "./theme/palette";

export { parseSiteConfig, originFor, authorBySlug } from "./site/schema";
export type { Author, SiteConfig } from "./site/schema";

export { parseFrontmatter, isValidSlug } from "./content/frontmatter";
export { isServable, livePosts, paginate } from "./content/visibility";
export type { PageSlice } from "./content/visibility";
export { hreflangAlternates } from "./content/hreflang";
export type { FaqItem, HreflangAlternate, Post, PostFrontmatter, PostStatus } from "./content/types";

export { absoluteUrl, authorPath, authorUrl, indexPagePath, postPath, postUrl } from "./seo/urls";
export { authorJsonLd, faqPageNode, organizationNode, personNode, postJsonLd, siteJsonLd } from "./seo/jsonld";
export { AI_CRAWLERS, robotsTxt, rssXml, sitemapXml } from "./seo/feeds";
export { pageMetadata, postMetadata, siteMetadata } from "./seo/metadata";

export { htmlAttributes, JsonLd, SiteFooter, SiteHeader, SiteShell, ThemeStyle } from "./components/chrome";
export {
  AboutContent,
  AuthorProfile,
  AuthorsIndex,
  FaqBlock,
  Pagination,
  PostArticle,
  PostIndex,
  PostList,
} from "./components/posts";

export { escapeHtml, escapeXml, jsonLdSafe, toIsoDate, toRfc822 } from "./util";
