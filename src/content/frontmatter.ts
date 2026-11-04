// Validate + coerce raw post frontmatter (see ./types.ts for the contract).
// Missing required keys fail the build loudly — a post without a byline or a
// schedule gate must never ship silently.

import { SCHEMA_VARIANTS, type SchemaVariant } from "../theme/schema";
import type { FaqItem, PostFrontmatter, PostStatus } from "./types";

const STATUSES: readonly PostStatus[] = ["published", "scheduled"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Site-relative image path only: never an absolute URL, `javascript:` or `data:`.
const SITE_RELATIVE = /^\/(?!\/)[^\s"'<>]*$/;

const str = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

function required(raw: Record<string, unknown>, key: string, slug: string): string {
  const value = str(raw[key]);
  if (!value) throw new Error(`[post] '${slug}' is missing required frontmatter key '${key}'`);
  return value;
}

function coerceFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): FaqItem[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const question = str((entry as Record<string, unknown>).question);
    const answer = str((entry as Record<string, unknown>).answer);
    return question && answer ? [{ question, answer }] : [];
  });
}

function coerceObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isValidSlug(slug: string): boolean {
  return SLUG.test(slug);
}

export function parseFrontmatter(raw: Record<string, unknown>, slug: string): PostFrontmatter {
  if (!isValidSlug(slug)) {
    throw new Error(`[post] file name '${slug}' must be lowercase words joined by hyphens`);
  }
  const status = required(raw, "status", slug);
  if (!STATUSES.includes(status as PostStatus)) {
    throw new Error(`[post] '${slug}' has status '${status}'; expected "published" or "scheduled"`);
  }
  const publishAt = required(raw, "publishAt", slug);
  if (Number.isNaN(Date.parse(publishAt))) {
    throw new Error(`[post] '${slug}' has an unparseable publishAt '${publishAt}'`);
  }
  const coverImage = str(raw.coverImage);
  const coverImageAlt = str(raw.coverImageAlt);
  if (coverImage && !SITE_RELATIVE.test(coverImage)) {
    throw new Error(`[post] '${slug}' coverImage must be a site-relative path starting with '/'`);
  }
  if (coverImage && !coverImageAlt) {
    throw new Error(`[post] '${slug}' sets coverImage without coverImageAlt (alt text is required)`);
  }
  const variant = str(raw.schemaVariant);

  return {
    title: required(raw, "title", slug),
    description: str(raw.description),
    status: status as PostStatus,
    publishAt,
    updatedAt: str(raw.updatedAt),
    lang: str(raw.lang),
    author: required(raw, "author", slug),
    authorSlug: required(raw, "authorSlug", slug),
    schemaVariant: SCHEMA_VARIANTS.find((v): v is SchemaVariant => v === variant) ?? null,
    translationKey: str(raw.translationKey),
    faqSchema: coerceObject(raw.faqSchema),
    faq: coerceFaq(raw.faq),
    coverImage,
    coverImageAlt,
  };
}
