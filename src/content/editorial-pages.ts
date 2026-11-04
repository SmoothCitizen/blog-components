// The /disclosure and /about editorial pages for a sponsor-disclosure site.
//
// The copy lives here (not in each blog repo) so an edit to the editorial
// integrity statement lands in ONE place and reaches every site that shows it.
// It is deliberately brand-neutral: it names the site and the configured
// publisher entity through `{placeholder}` tokens, and describes no specific
// product. A consuming page runs `substitutePlaceholders` once at build time so
// the static HTML carries fully-substituted copy. Render the result with the
// markdown renderer (`MarkdownBody`).

import type { SponsorConfig } from "../site/schema";

export interface EditorialPlaceholders {
  site_name: string;
  site_niche: string;
  contact_email: string;
  publisher_entity: string;
  publisher_url: string;
}

const RECOGNIZED_KEYS: ReadonlyArray<keyof EditorialPlaceholders> = [
  "site_name",
  "site_niche",
  "contact_email",
  "publisher_entity",
  "publisher_url",
];

// Map the site name + sponsor config onto the placeholder values. `site_niche`
// and `contact_email` fall back to generic, non-empty copy when the sponsor
// block leaves them unset, so substitution never fails on an optional field.
export function buildEditorialPlaceholders(siteName: string, sponsor: SponsorConfig): EditorialPlaceholders {
  return {
    site_name: siteName,
    site_niche: sponsor.niche ?? "the topics we cover",
    contact_email: sponsor.contactEmail ?? "",
    publisher_entity: sponsor.publisherEntity,
    publisher_url: sponsor.attributionUrl,
  };
}

// Substitute every `{placeholder}` token. Throws when a recognized key is
// empty — a live disclosure page must never render a literal `{site_name}`.
// `contact_email` is the one key allowed to be empty: a site may publish no
// correction inbox, and the templates omit the contact section when it is.
export function substitutePlaceholders(template: string, values: EditorialPlaceholders): string {
  for (const key of RECOGNIZED_KEYS) {
    if (key === "contact_email") continue;
    if (!values[key] || values[key].trim().length === 0) {
      throw new Error(`[editorial] placeholder '${key}' is required but empty`);
    }
  }
  let output = template;
  for (const key of RECOGNIZED_KEYS) {
    output = output.split(`{${key}}`).join(values[key]);
  }
  return output;
}

// The contact line, appended to each page only when a correction inbox exists.
function contactSection(email: string): string {
  if (!email.trim()) return "";
  return `\n## Contact\n\nEditorial concerns, factual corrections and takedown requests: [${email}](mailto:${email}).\n`;
}

export function disclosurePageMarkdown(values: EditorialPlaceholders): string {
  const body = `# Editorial Integrity and Disclosure

## What this site is

{site_name} is published by {publisher_entity}. We review products and surface
comparisons in {site_niche} to help readers make informed decisions.

## How we make money

Some of the brands we cover are paid partners of {publisher_entity}. When a
brand is a paid partner we disclose it both in the article featuring them and on
the site-wide banner.

Being a paid partner means the brand is included in our coverage. It does NOT
mean the brand can dictate where it ranks, suppress a competitor, or edit our
editorial content.

## Our editorial standards

- Comparisons include both paying and non-paying brands; we never publish a
  comparison containing only paying brands.
- Claims are sourced from public documentation, hands-on evaluation, or cited
  third-party reviews.
- Superlative claims are reserved for measurable comparisons with cited
  criteria.
- Updates to articles are timestamped and the revision history is available on
  request.

## Who writes our content

Our articles are produced through a hybrid editorial process combining AI draft
generation with human editorial review. Every article is reviewed by a named
author before publication.
`;
  return substitutePlaceholders(body + contactSection(values.contact_email), values);
}

export function aboutPageMarkdown(values: EditorialPlaceholders): string {
  const body = `# About {site_name}

## Who publishes this site

This site is published by {publisher_entity}. See [{publisher_url}]({publisher_url})
for more about the publisher.

## What we cover

{site_name} reviews products and surfaces comparisons in {site_niche}. Our
coverage exists to help readers make informed decisions through structured,
comparative analysis.

## How we work

We produce articles through a hybrid editorial process: AI draft generation
paired with human editorial review. Every article is reviewed by a named author
before publication, which is what makes the published result accountable.

## Editorial integrity

Some of the brands we cover are paid partners. The relationship — when it exists
— is disclosed on both the article page and the site-wide banner. For the full
editorial-integrity model see our [Disclosure Policy](/disclosure).
`;
  return substitutePlaceholders(body + contactSection(values.contact_email), values);
}
