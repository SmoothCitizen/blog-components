// Multilingual helpers: how a post's language is resolved, which direction it
// reads, and how language-variant posts are grouped into one family.
//
// A blog has ONE default language (`site.language`). A post whose language is
// the default is served at `/posts/<slug>`; a post in any other language at
// `/<lang>/posts/<slug>`. Language variants of one article are linked by
// `translationOf`: every variant carries the ROOT post's slug, and the root
// carries none. The family of a post is therefore every live post that
// resolves to the same root slug (the root included).

import type { Post, PostFrontmatter } from "./types";

// Right-to-left scripts. Kept as a small local list (base ISO-639-1 subtags)
// so the package carries its own locale fact and never depends on a server
// list. Extend this one array to add a script. A tag like "ar-EG" matches on
// its base subtag "ar".
export const RTL_BASE_LANGS: readonly string[] = ["ar", "he", "fa", "ur"];

// The base (primary) subtag of a BCP-47 tag, lowercased: "ja" from "ja",
// "zh" from "zh-Hant", "ar" from "AR-eg".
export function baseLang(lang: string | null | undefined): string {
  return (lang ?? "").trim().toLowerCase().split("-")[0] ?? "";
}

export function isRtlLang(lang: string | null | undefined): boolean {
  return RTL_BASE_LANGS.includes(baseLang(lang));
}

export type Direction = "ltr" | "rtl";

// The single source of truth for a language's writing direction. RTL for the
// scripts in RTL_BASE_LANGS, LTR for everything else.
export function dirForLang(lang: string | null | undefined): Direction {
  return isRtlLang(lang) ? "rtl" : "ltr";
}

// The effective language of a post: its own `lang`, else the site default. A
// post with no `lang` key is in the default language.
export function postLang(
  post: Pick<Post, "frontmatter">,
  defaultLang: string,
): string {
  return (post.frontmatter.lang ?? defaultLang).trim().toLowerCase();
}

// True when the post is in the site's default language (served at the
// un-prefixed `/posts/<slug>`).
export function isDefaultLang(
  post: Pick<Post, "frontmatter">,
  defaultLang: string,
): boolean {
  return postLang(post, defaultLang) === defaultLang.trim().toLowerCase();
}

// The slug that identifies a post's translation family: the root slug it points
// at, or — for a root/monolingual post — its own slug.
export function familyRootSlug(post: Pick<Post, "slug" | "frontmatter">): string {
  return post.frontmatter.translationOf?.trim() || post.slug;
}

// Every live post in `post`'s translation family (the post itself included),
// ordered deterministically: the default-language member first, then the rest
// by language tag, then by slug. The root is whichever member's own slug equals
// the family root slug (it need not be live — a variant can be live before its
// root).
export function translationFamily(
  post: Pick<Post, "slug" | "frontmatter">,
  live: readonly Post[],
  defaultLang: string,
): Post[] {
  const root = familyRootSlug(post);
  const members = live.filter((p) => familyRootSlug(p) === root);
  return [...members].sort((a, b) => {
    const la = postLang(a, defaultLang);
    const lb = postLang(b, defaultLang);
    if (la === defaultLang && lb !== defaultLang) return -1;
    if (lb === defaultLang && la !== defaultLang) return 1;
    return la === lb ? a.slug.localeCompare(b.slug) : la.localeCompare(lb);
  });
}

// The non-default languages that have at least one live post, sorted. Drives
// the per-language index + feed routes and the header language switch. The
// default language is never in this list (it owns the un-prefixed routes).
export function nonDefaultLanguages(live: readonly Post[], defaultLang: string): string[] {
  const dflt = defaultLang.trim().toLowerCase();
  const langs = new Set<string>();
  for (const post of live) {
    const lang = postLang(post, defaultLang);
    if (lang !== dflt) langs.add(lang);
  }
  return [...langs].sort();
}

// Every language present on the site (the default first, then the non-default
// ones), each with the posts in it. The default language is always present
// even with zero posts (it owns `/`); a non-default language appears only when
// it has posts.
export function languagesPresent(live: readonly Post[], defaultLang: string): string[] {
  return [defaultLang.trim().toLowerCase(), ...nonDefaultLanguages(live, defaultLang)];
}

// The default "back to all posts" link label (v0.9.0), localized by the post's
// base language. A language not in this table — and any blank/unknown tag —
// falls back to English. Keyed by the base subtag (so "pt-BR" uses "pt").
const BACK_LABELS: Readonly<Record<string, string>> = {
  en: "All posts",
  es: "Todas las entradas",
  ja: "記事一覧",
  fr: "Tous les articles",
  de: "Alle Beiträge",
  pt: "Todos os artigos",
};

export function defaultBackLabel(lang: string | null | undefined): string {
  return BACK_LABELS[baseLang(lang)] ?? BACK_LABELS.en ?? "All posts";
}

// The live posts in one language (newest-first order is preserved from `live`).
export function postsInLanguage(
  live: readonly Post[],
  lang: string,
  defaultLang: string,
): Post[] {
  const target = lang.trim().toLowerCase();
  return live.filter((post) => postLang(post, defaultLang) === target);
}
