// schema.org structured data. The publisher Organization is always the blog's
// own brand (theme.brand_name on its own hostname).

import type { FaqItem, Post } from "../content/types";
import type { Author, SiteConfig, SponsorConfig } from "../site/schema";
import type { ThemeConfig } from "../theme/schema";
import { absoluteUrl, authorUrl, postUrlFor } from "./urls";

const SCHEMA_CONTEXT = "https://schema.org";

type JsonObject = Record<string, unknown>;
// `sponsor` is optional: present (non-null) only on a sponsor-disclosure site,
// where the schema publisher is the configured publisher entity instead of the
// blog's own brand.
type SiteRef = Pick<SiteConfig, "canonical_hostname" | "language"> & { sponsor?: SponsorConfig | null };
type ThemeRef = Pick<ThemeConfig, "brand_name" | "logo_key" | "schema_variant" | "tagline">;

export function organizationNode(site: SiteRef, theme: ThemeRef): JsonObject {
  const org: JsonObject = {
    "@type": "Organization",
    "@id": `${absoluteUrl(site, "/")}#organization`,
    name: theme.brand_name,
    url: absoluteUrl(site, "/"),
  };
  if (theme.logo_key) org.logo = { "@type": "ImageObject", url: absoluteUrl(site, theme.logo_key) };
  return org;
}

// The publisher node for a sponsor-disclosure site: the configured legal
// publisher entity, not the blog brand.
export function sponsorOrganizationNode(sponsor: SponsorConfig): JsonObject {
  return { "@type": "Organization", name: sponsor.publisherEntity, url: sponsor.attributionUrl };
}

function publisherNode(site: SiteRef, theme: ThemeRef): JsonObject {
  return site.sponsor ? sponsorOrganizationNode(site.sponsor) : organizationNode(site, theme);
}

export function personNode(site: SiteRef, author: Pick<Author, "slug" | "name"> & Partial<Author>): JsonObject {
  const url = authorUrl(site, author.slug);
  const person: JsonObject = { "@type": "Person", "@id": url, name: author.name, url };
  if (author.title) person.jobTitle = author.title;
  if (author.bio) person.description = author.bio;
  if (author.expertise && author.expertise.length > 0) person.knowsAbout = author.expertise;
  if (site.sponsor) person.worksFor = { "@type": "Organization", name: site.sponsor.publisherEntity };
  return person;
}

export function faqPageNode(items: readonly FaqItem[]): JsonObject | null {
  if (items.length === 0) return null; // never an empty/padded FAQPage
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

// JSON-LD blocks for a post page: the Article/BlogPosting node (author +
// publisher inline), a standalone Person, a standalone Organization, and a
// FAQPage when the post carries one (publisher-written `faqSchema`, else a
// hand-authored `faq` list).
export function postJsonLd(post: Post, site: SiteRef, theme: ThemeRef, author: Author | undefined): JsonObject[] {
  const fm = post.frontmatter;
  const person = personNode(site, author ?? { slug: fm.authorSlug, name: fm.author });
  const publisher = publisherNode(site, theme);
  const url = postUrlFor(site, post, site.language);
  const variant = fm.schemaVariant ?? theme.schema_variant;
  // A "Review" post emits schema.org Review (per-item): the reviewed item is
  // the post's first paid brand, else the headline. Any other variant keeps
  // the Article/BlogPosting shape.
  const primary: JsonObject =
    variant === "Review"
      ? {
          "@context": SCHEMA_CONTEXT,
          "@type": "Review",
          name: fm.title,
          url,
          datePublished: fm.publishAt,
          author: person,
          publisher,
          itemReviewed: { "@type": "SoftwareApplication", name: fm.paidBrands[0] ?? fm.title },
        }
      : {
          "@context": SCHEMA_CONTEXT,
          "@type": variant,
          headline: fm.title,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          url,
          inLanguage: fm.lang ?? site.language,
          datePublished: fm.publishAt,
          dateModified: fm.updatedAt ?? fm.publishAt,
          author: person,
          publisher,
        };
  if (fm.description && variant !== "Review") primary.description = fm.description;
  if (fm.coverImage && variant !== "Review") primary.image = absoluteUrl(site, fm.coverImage);

  const blocks: JsonObject[] = [
    primary,
    { "@context": SCHEMA_CONTEXT, ...person },
    { "@context": SCHEMA_CONTEXT, ...publisher },
  ];
  const faq = fm.faqSchema
    ? { "@context": SCHEMA_CONTEXT, "@type": "FAQPage", ...fm.faqSchema }
    : faqPageNode(fm.faq);
  if (faq) blocks.push(faq);
  return blocks;
}

export function siteJsonLd(site: SiteRef & Pick<SiteConfig, "description">, theme: ThemeRef): JsonObject[] {
  const blog: JsonObject = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Blog",
    name: theme.brand_name,
    url: absoluteUrl(site, "/"),
    inLanguage: site.language,
    publisher: publisherNode(site, theme),
  };
  const description = site.description ?? theme.tagline;
  if (description) blog.description = description;
  return [blog];
}

export function authorJsonLd(site: SiteRef, author: Author): JsonObject[] {
  return [{ "@context": SCHEMA_CONTEXT, ...personNode(site, author) }];
}
