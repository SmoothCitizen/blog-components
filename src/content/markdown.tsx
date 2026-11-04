// A lightweight markdown renderer for hand-written post bodies and the
// editorial pages (disclosure / about). It is deliberately NOT a full markdown
// engine: generated posts ship their body as sanitized HTML (rendered verbatim
// — see `PostBody`), and hand-written posts use this small, dependency-free
// grammar. Future complexity (code fences, tables) belongs in an HTML body.
//
// Security: this renderer never emits raw HTML from its input — every branch
// builds React elements directly, so there is no `dangerouslySetInnerHTML`
// anywhere in it, and only http(s)/site-relative image sources render an
// `<img>` (a `javascript:`/`data:` src renders as plain text, never a tag).
//
// The grammar covered: `#`/`##`/`###` headings, blank-line-separated
// paragraphs, `- ` unordered lists, inline `[text](href)` links, `**bold**`
// and `*italic*`, and a standalone `![alt](src "caption")` captioned figure.

import { Fragment, type FC, type ReactNode } from "react";

import type { BodyFormat } from "./types";

// A body is HTML when its first non-whitespace content is an HTML block-element
// opening tag; otherwise it is markdown. This is the fallback when a post sets
// no explicit `bodyFormat` — so a hand-written markdown post that forgets the
// key still renders as markdown instead of a wall of raw text, and a generated
// HTML body still renders as HTML. Markdown that merely *contains* inline HTML
// (e.g. a `<strong>` mid-paragraph) is still markdown, because it does not
// START with a block tag.
const HTML_BODY_RE = /^\s*<(article|section|p|h[1-6]|div|figure|ul|ol|table|header)[\s/>]/i;

// Resolve the effective body format. An explicit `bodyFormat` always wins; a
// null (absent) format is auto-detected from the body.
export function resolveBodyFormat(bodyFormat: BodyFormat | null, html: string): BodyFormat {
  if (bodyFormat) return bodyFormat;
  return HTML_BODY_RE.test(html) ? "html" : "markdown";
}

const INLINE_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITALIC_RE = /\*([^*]+)\*/g;
// A whole-line `![alt](src)` or `![alt](src "caption")`.
const BLOCK_IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const SAFE_IMAGE_SRC_RE = /^(https?:\/\/|\/)/;

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; alt: string; src: string; caption: string | null };

// Parse a markdown source string into a flat block list. Pure and
// side-effect-free so a build (and a unit test) can assert the structure
// without rendering React.
export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.split("\n");
  const blocks: MarkdownBlock[] = [];
  let buffer: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = (): void => {
    if (buffer.length > 0) {
      blocks.push({ type: "paragraph", text: buffer.join(" ") });
      buffer = [];
    }
  };
  const flushList = (): void => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }
    const img = BLOCK_IMAGE_RE.exec(line.trim());
    const h1 = /^# (.+)$/.exec(line);
    const h2 = /^## (.+)$/.exec(line);
    const h3 = /^### (.+)$/.exec(line);
    const li = /^- (.+)$/.exec(line);
    if (img && SAFE_IMAGE_SRC_RE.test(img[2]!)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "image", alt: img[1]!, src: img[2]!, caption: img[3]?.trim() ? img[3].trim() : null });
    } else if (h1) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 1, text: h1[1]! });
    } else if (h2) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: h2[1]! });
    } else if (h3) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: h3[1]! });
    } else if (li) {
      flushParagraph();
      listItems.push(li[1]!);
    } else {
      flushList();
      buffer.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderItalic(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  ITALIC_RE.lastIndex = 0;
  while ((match = ITALIC_RE.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(<em key={`i-${match.index}`}>{match[1]}</em>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function renderEmphasis(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  BOLD_RE.lastIndex = 0;
  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > cursor) parts.push(renderItalic(text.slice(cursor, match.index)));
    parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(renderItalic(text.slice(cursor)));
  return <>{parts}</>;
}

function renderInline(text: string): ReactNode {
  const segments: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  INLINE_LINK_RE.lastIndex = 0;
  while ((match = INLINE_LINK_RE.exec(text)) !== null) {
    const [whole, label, href] = match;
    if (match.index > cursor) segments.push(renderEmphasis(text.slice(cursor, match.index)));
    segments.push(
      <a key={`lnk-${match.index}`} href={href}>
        {label}
      </a>,
    );
    cursor = match.index + whole!.length;
  }
  if (cursor < text.length) segments.push(renderEmphasis(text.slice(cursor)));
  return <>{segments}</>;
}

// Semantic captioned image. Only http(s)/site-relative sources render an
// `<img>`; `alt` is required (accessibility + E-E-A-T). A static-export site
// has no image optimizer, so a plain `<img>` is correct here.
export const Figure: FC<{ src: string; alt: string; caption?: string | null; priority?: boolean }> = ({
  src,
  alt,
  caption,
  priority = false,
}) => {
  if (!SAFE_IMAGE_SRC_RE.test(src)) return null;
  return (
    <figure>
      <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
};

// Render a markdown source string as React elements. The caller wraps it in the
// `.post-body` container, so headings/paragraphs/lists/figures inherit the
// theme's post-body typography — identical to an HTML body.
export const MarkdownBody: FC<{ source: string }> = ({ source }) => {
  const blocks = parseMarkdownBlocks(source);
  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          const Tag = `h${block.level}` as "h1" | "h2" | "h3";
          return <Tag key={idx}>{renderInline(block.text)}</Tag>;
        }
        if (block.type === "list") {
          return (
            <ul key={idx}>
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "image") {
          return <Figure key={idx} src={block.src} alt={block.alt} caption={block.caption} />;
        }
        return (
          <p key={idx}>
            <Fragment>{renderInline(block.text)}</Fragment>
          </p>
        );
      })}
    </>
  );
};
