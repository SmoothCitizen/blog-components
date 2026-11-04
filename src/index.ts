// Public API of the blog components package. Filesystem code lives in the
// separate "./content" entry (Node only).

export {
  parseTheme,
  isSafeNavHref,
  DEFAULT_FONT_PAIR,
  DEFAULT_LAYOUT,
  DEFAULT_HEADER_VARIANT,
  DEFAULT_POST_VARIANT,
  DEFAULT_SCHEMA_VARIANT,
  DEFAULT_RADIUS,
  DEFAULT_SPACE,
  LAYOUT_VARIANTS,
  HEADER_VARIANTS,
  POST_VARIANTS,
  SCHEMA_VARIANTS,
  POST_SCHEMA_VARIANTS,
  NAV_LINKS_MAX,
  NAV_LABEL_MAX,
  LOGO_WIDTH_MIN,
  LOGO_WIDTH_MAX,
} from "./theme/schema";
export type {
  LayoutVariant,
  HeaderVariant,
  PostVariant,
  SchemaVariant,
  PostSchemaVariant,
  ThemeConfig,
  ThemeFonts,
  ThemePalette,
  ThemeSurface,
  NavLink,
  NavLinkStyle,
} from "./theme/schema";
export { FONT_PAIRS, resolveFont, resolveLayout, resolveSurface, themeCss, DARK_SURFACE_MAX_LUMINANCE } from "./theme/css";
export { classer, prefixStylesheet } from "./theme/classes";
export { derivePalette, contrastRatio, guardAccent, normalizeHex, paletteCssVars, AA_CONTRAST } from "./theme/palette";

export { parseSiteConfig, originFor, authorBySlug } from "./site/schema";
export type { Author, SiteConfig, SiteFeatures, SponsorConfig } from "./site/schema";

export { parseFrontmatter, isValidSlug } from "./content/frontmatter";
export { isServable, livePosts, paginate } from "./content/visibility";
export type { PageSlice } from "./content/visibility";
export { hreflangAlternates } from "./content/hreflang";
export type { BodyFormat, FaqItem, HreflangAlternate, Post, PostFrontmatter, PostStatus } from "./content/types";
export { MarkdownBody, Figure, parseMarkdownBlocks, resolveBodyFormat } from "./content/markdown";
export type { MarkdownBlock } from "./content/markdown";
export {
  aboutPageMarkdown,
  disclosurePageMarkdown,
  buildEditorialPlaceholders,
  substitutePlaceholders,
} from "./content/editorial-pages";
export type { EditorialPlaceholders } from "./content/editorial-pages";

export { absoluteUrl, authorPath, authorUrl, indexPagePath, postPath, postUrl } from "./seo/urls";
export { authorJsonLd, faqPageNode, organizationNode, sponsorOrganizationNode, personNode, postJsonLd, siteJsonLd } from "./seo/jsonld";
export { AI_CRAWLERS, robotsTxt, rssXml, sitemapXml } from "./seo/feeds";
export { pageMetadata, postMetadata, siteMetadata } from "./seo/metadata";

export { htmlAttributes, JsonLd, SiteFooter, SiteHeader, SiteShell, ThemeStyle } from "./components/chrome";
export { DisclosureBanner, PaidPlacementCallout, SponsorAttribution, showSponsorBanner, showPaidPlacement } from "./components/disclosure";
export {
  AboutContent,
  AuthorProfile,
  AuthorsIndex,
  FaqBlock,
  Pagination,
  PostArticle,
  PostBody,
  PostIndex,
  PostList,
} from "./components/posts";

export { escapeHtml, escapeXml, jsonLdSafe, toIsoDate, toRfc822 } from "./util";
