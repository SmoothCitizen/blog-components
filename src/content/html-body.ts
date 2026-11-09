// Helpers for the HTML post body (the sanitized article HTML a generated post
// ships, rendered verbatim by `PostBody`). The markdown renderer is untouched.

// Generated bodies open with the article's own headline block —
// `<article><header><h1>…</h1></header>…` — which repeats the <h1> the post page
// already renders from the frontmatter title, so the page shows the headline
// twice. `stripLeadingBodyHeadline` removes that ONE leading headline (and the
// <header> wrapper it leaves empty), leaving every other body unchanged.
//
// It acts only on the FIRST <h1>, and only when that <h1> leads the article —
// an <h1> that appears after real content (<h2>, <p> or <section>) is a genuine
// in-body heading and is kept. A hand-written HTML body with no leading <h1> is
// returned unchanged. The input is our own generated / sanitized HTML, so the
// bounded, non-greedy matches below cannot blow up on it.

// The article's leading content markers: once one has appeared, a later <h1> is
// in-body, not the headline.
const LEADING_CONTENT_RE = /<(?:h2|p|section)\b/i;
// The first <h1>…</h1> (non-greedy to the first closing tag).
const FIRST_H1_RE = /<h1\b[^>]*>[\s\S]*?<\/h1>/i;
// A <header> that holds nothing but whitespace — the wrapper the removed
// headline leaves behind. A header that still holds other content (e.g. a
// byline) does not match and is kept.
const EMPTY_HEADER_RE = /<header\b[^>]*>\s*<\/header>/i;

export function stripLeadingBodyHeadline(html: string): string {
  const match = FIRST_H1_RE.exec(html);
  if (!match) return html;
  // Only strip a headline that leads the article: nothing but wrapper tags
  // (`<article>`, `<header>`) and whitespace may precede it.
  if (LEADING_CONTENT_RE.test(html.slice(0, match.index))) return html;
  const withoutHeadline = html.slice(0, match.index) + html.slice(match.index + match[0].length);
  return withoutHeadline.replace(EMPTY_HEADER_RE, "");
}
