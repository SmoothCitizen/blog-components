// Per-site class namespacing. A site sets `class_prefix` in its theme so its
// rendered class names (and the matching stylesheet selectors) are its own,
// rather than every site sharing the identical `class="post-body"` markup —
// which would be a shared-HTML fingerprint across independently-published
// sites. The default is "" (no prefix), so a site that sets no prefix renders
// byte-identical class names to before.
//
// `classer(prefix)` returns a function that prefixes one or more class tokens;
// `prefixStylesheet` applies the SAME transform to a generated stylesheet so
// the selectors match the prefixed markup. The two MUST use the same rule.

export function classer(prefix: string | null | undefined): (...names: string[]) => string {
  const p = prefix && prefix.trim() ? prefix.trim() : "";
  return (...names) => names.filter(Boolean).map((n) => (p ? `${p}-${n}` : n)).join(" ");
}

// Prefix every class-selector token (`.name`) in a generated stylesheet with
// `prefix-`. Only tokens that start with a letter after the dot are touched, so
// numeric fragments (`.5em`, `0.9em`), hex colors, attribute selectors and
// pseudo-classes are untouched. A no-op when the prefix is empty.
export function prefixStylesheet(css: string, prefix: string | null | undefined): string {
  const p = prefix && prefix.trim() ? prefix.trim() : "";
  if (!p) return css;
  return css.replace(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g, (_m, cls) => `.${p}-${cls}`);
}
