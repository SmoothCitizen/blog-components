// hreflang alternates, computed at build time from the LIVE posts only.
//
// Language versions of one article form a family (see ./languages.ts): each
// variant carries the ROOT post's slug in `translationOf`, so a post's family
// is every live post that resolves to the same root slug. Because the set is
// derived from what this build actually renders, an alternate can never point
// at a scheduled (unbuilt) sibling, and reciprocity holds by construction — no
// publisher round-trip has to patch the siblings.
//
// Each post page emits one `<link rel="alternate" hreflang>` per language in
// its family plus an `x-default` pointing at the default-language version (or,
// when there is no default-language sibling, the family root). A post with no
// live sibling emits nothing.

import type { SiteConfig } from "../site/schema";
import { postUrlFor } from "../seo/urls";
import { familyRootSlug, postLang, translationFamily } from "./languages";
import type { HreflangAlternate, Post } from "./types";

export function hreflangAlternates(
  post: Post,
  live: readonly Post[],
  site: Pick<SiteConfig, "canonical_hostname" | "language">,
): HreflangAlternate[] {
  const family = translationFamily(post, live, site.language);
  if (!family.some((p) => p.slug === post.slug)) return [];

  const byLang = new Map<string, Post>();
  for (const member of family) {
    const lang = postLang(member, site.language);
    if (!byLang.has(lang)) byLang.set(lang, member);
  }
  if (byLang.size <= 1) return [];

  const alternates: HreflangAlternate[] = [...byLang.entries()].map(([lang, member]) => ({
    hreflang: lang,
    href: postUrlFor(site, member, site.language),
  }));

  // x-default → the default-language version, else the family root, else the
  // first member (stable order from `translationFamily`).
  const dflt = site.language.trim().toLowerCase();
  const rootSlug = familyRootSlug(post);
  const xDefault =
    byLang.get(dflt) ?? family.find((p) => p.slug === rootSlug) ?? family[0]!;
  alternates.push({ hreflang: "x-default", href: postUrlFor(site, xDefault, site.language) });

  return alternates;
}
