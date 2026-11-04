// hreflang alternates, computed at build time from the LIVE posts only.
//
// Language versions of one article share a `translationKey`. Because the set is
// derived from what this build actually renders, an alternate can never point
// at a scheduled (unbuilt) sibling, and reciprocity holds by construction — no
// publisher round-trip has to patch the siblings.

import type { SiteConfig } from "../site/schema";
import { postUrl } from "../seo/urls";
import type { HreflangAlternate, Post } from "./types";

export function hreflangAlternates(
  post: Post,
  live: readonly Post[],
  site: Pick<SiteConfig, "canonical_hostname" | "language">,
): HreflangAlternate[] {
  const key = post.frontmatter.translationKey;
  if (!key) return [];
  const family = live.filter((p) => p.frontmatter.translationKey === key);
  if (!family.some((p) => p.slug === post.slug)) return [];

  const byLang = new Map<string, HreflangAlternate>();
  for (const member of family) {
    const lang = member.frontmatter.lang ?? site.language;
    if (!byLang.has(lang)) byLang.set(lang, { hreflang: lang, href: postUrl(site, member.slug) });
  }
  return byLang.size > 1 ? [...byLang.values()] : [];
}
