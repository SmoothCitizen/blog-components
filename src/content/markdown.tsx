// A lightweight markdown renderer for hand-written post bodies and the
// editorial pages (disclosure / about). It is deliberately NOT a full markdown
// engine: generated posts ship their body as sanitized HTML (rendered verbatim
// — see `PostBody`), and hand-written posts use this small, dependency-free
// grammar. Anything beyond it (code fences, nested lists, raw HTML) belongs in
// an HTML body.
//
// Security: this renderer never emits raw HTML from its input — every branch
// builds React elements directly (React escapes every text node and
// attribute), so there is no `dangerouslySetInnerHTML` anywhere in it. Only
// http(s)/site-relative image sources render an `<img>` (a `javascript:` /
// `data:` src renders as plain text, never a tag), and a link whose target is
// a `javascript:` / `data:` / `vbscript:` URL renders as its plain label.
//
// The grammar covered: `#`/`##`/`###` headings, blank-line-separated
// paragraphs, `- ` unordered lists, inline `[text](href)` links, `**bold**`,
// `*italic*`, `` `inline code` `` (v0.6.0), GFM pipe tables (v0.6.0) and a
// standalone `![alt](src "caption")` captioned figure.

import { Fragment, type FC, type ReactNode } from "react";

import { classer } from "../theme/classes";
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
// A code span: a run of N backticks, content, the same run of N backticks
// (CommonMark), e.g. `x` or ``a`b``.
const CODE_SPAN_RE = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g;
// Code spans are lifted out of the text before link/emphasis parsing (so `*`,
// `[` and `]` inside code stay literal) and replaced by these private-use
// sentinels; any sentinel already in the source is stripped first.
const CODE_OPEN = "";
const CODE_CLOSE = "";
const SENTINEL_RE = /[]/g;
const PLACEHOLDER_RE = /(\d+)/g;
// A whole-line `![alt](src)` or `![alt](src "caption")`.
const BLOCK_IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const SAFE_IMAGE_SRC_RE = /^(https?:\/\/|\/)/;
// Script-capable URL schemes; checked after stripping whitespace/control chars
// (browsers ignore them inside a scheme, e.g. "java\tscript:").
const UNSAFE_HREF_RE = /^(javascript|data|vbscript):/i;
// A GFM table delimiter cell: hyphens with an optional colon on either side.
const TABLE_DELIMITER_CELL_RE = /^:?-+:?$/;

export type TableAlign = "left" | "center" | "right" | null;

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; alt: string; src: string; caption: string | null }
  | { type: "table"; align: TableAlign[]; header: string[]; rows: string[][] };

// Split one table row into its cells: optional leading/trailing pipe, `\|` is
// a literal pipe (also inside a code span, as in GFM), each cell trimmed.
export function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cell = "";
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]!;
    if (ch === "\\" && s[i + 1] === "|") {
      cell += "|";
      i += 1;
    } else if (ch === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

// The column alignments of a GFM delimiter row (`| :-- | :-: | --: |`), or null
// when the line is not one. It must contain a pipe (so a lone `---` is never a
// table) and every cell must be hyphens with optional colons.
export function tableAlignments(line: string): TableAlign[] | null {
  if (!line.includes("|")) return null;
  const cells = splitTableRow(line);
  if (cells.length === 0 || !cells.every((c) => TABLE_DELIMITER_CELL_RE.test(c))) return null;
  return cells.map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return null;
  });
}

// Pad / truncate a body row to the header's column count (GFM: missing cells
// are empty, excess cells are ignored).
function fitRow(cells: string[], width: number): string[] {
  return Array.from({ length: width }, (_, i) => cells[i] ?? "");
}

// Parse a markdown source string into a flat block list. Pure and
// side-effect-free so a build (and a unit test) can assert the structure
// without rendering React.
export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.split("\n").map((l) => l.replace(/\s+$/, ""));
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

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }
    // A GFM table: a header row with a pipe, then a delimiter row with the
    // same number of cells, then body rows until a blank line or a line
    // without a pipe.
    const align = line.includes("|") && i + 1 < lines.length ? tableAlignments(lines[i + 1]!) : null;
    const header = align ? splitTableRow(line) : null;
    if (align && header && header.length === align.length) {
      flushParagraph();
      flushList();
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j] !== "" && lines[j]!.includes("|")) {
        rows.push(fitRow(splitTableRow(lines[j]!), header.length));
        j += 1;
      }
      blocks.push({ type: "table", align, header, rows });
      i = j - 1;
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

// True when a link target is safe to render as an `<a href>` (no script-capable
// scheme). Relative paths, fragments, `https:`, `mailto:` etc. all pass.
export function isSafeLinkHref(href: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !UNSAFE_HREF_RE.test(href.replace(/[\u0000- \u007f]+/g, ""));
}

// Lift every code span out of `text`, leaving a numbered sentinel in its
// place. The code content is kept verbatim (one leading + trailing space are
// stripped when both are present, as in CommonMark).
function extractCode(text: string): { text: string; codes: string[] } {
  const codes: string[] = [];
  const out = text.replace(SENTINEL_RE, "").replace(CODE_SPAN_RE, (_whole, _ticks: string, body: string) => {
    const code = body.length > 2 && body.startsWith(" ") && body.endsWith(" ") && body.trim() ? body.slice(1, -1) : body;
    codes.push(code);
    return `${CODE_OPEN}${codes.length - 1}${CODE_CLOSE}`;
  });
  return { text: out, codes };
}

// Put code spans back as plain text (for an href).
function restoreCodeText(text: string, codes: readonly string[]): string {
  return text.replace(PLACEHOLDER_RE, (_m, n: string) => codes[Number(n)] ?? "");
}

// Put code spans back as `<code>` elements. A string with no code span is
// returned unchanged (so a body without backticks renders exactly as before).
function restoreCode(text: string, codes: readonly string[], keyBase: string): ReactNode {
  if (!text.includes(CODE_OPEN)) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(<code key={`${keyBase}-c${match.index}`}>{codes[Number(match[1])] ?? ""}</code>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <Fragment key={keyBase}>{parts}</Fragment>;
}

function renderItalic(text: string, codes: readonly string[]): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  ITALIC_RE.lastIndex = 0;
  while ((match = ITALIC_RE.exec(text)) !== null) {
    if (match.index > cursor) parts.push(restoreCode(text.slice(cursor, match.index), codes, `t-${cursor}`));
    parts.push(<em key={`i-${match.index}`}>{restoreCode(match[1]!, codes, `ei-${match.index}`)}</em>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(restoreCode(text.slice(cursor), codes, `t-${cursor}`));
  return <>{parts}</>;
}

function renderEmphasis(text: string, codes: readonly string[]): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  BOLD_RE.lastIndex = 0;
  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > cursor) parts.push(renderItalic(text.slice(cursor, match.index), codes));
    parts.push(<strong key={`b-${match.index}`}>{restoreCode(match[1]!, codes, `sb-${match.index}`)}</strong>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(renderItalic(text.slice(cursor), codes));
  return <>{parts}</>;
}

// Inline markdown → React nodes: code spans first (their content is literal),
// then links, then bold/italic. Every piece of text is a React text node.
export function renderInline(source: string): ReactNode {
  const { text, codes } = extractCode(source);
  const segments: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  INLINE_LINK_RE.lastIndex = 0;
  while ((match = INLINE_LINK_RE.exec(text)) !== null) {
    const [whole, label, rawHref] = match;
    if (match.index > cursor) segments.push(renderEmphasis(text.slice(cursor, match.index), codes));
    const href = restoreCodeText(rawHref!, codes);
    const labelNode = restoreCode(label!, codes, `l-${match.index}`);
    segments.push(
      isSafeLinkHref(href) ? (
        <a key={`lnk-${match.index}`} href={href}>
          {labelNode}
        </a>
      ) : (
        <Fragment key={`lnk-${match.index}`}>{labelNode}</Fragment>
      ),
    );
    cursor = match.index + whole!.length;
  }
  if (cursor < text.length) segments.push(renderEmphasis(text.slice(cursor), codes));
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

// Each column gets at least this much width, so a wide table scrolls inside its
// wrapper on a phone instead of squeezing every cell to a word per line.
export const TABLE_MIN_COLUMN_EM = 7;

// A GFM table. The wrapper scrolls horizontally (inline style, so it works with
// any stylesheet version) and is a focusable, labelled region so keyboard users
// can scroll it. Cells use the theme's existing `.post-body table/th/td` rules.
export function MarkdownTable({
  block,
  classPrefix = "",
}: {
  block: Extract<MarkdownBlock, { type: "table" }>;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  const cellStyle = (i: number) => {
    const a = block.align[i];
    return a ? { textAlign: a } : undefined;
  };
  return (
    <div className={c("table-wrap")} role="region" aria-label="Table" tabIndex={0} style={{ overflowX: "auto" }}>
      <table style={{ minWidth: `${block.header.length * TABLE_MIN_COLUMN_EM}em` }}>
        <thead>
          <tr>
            {block.header.map((cell, i) => (
              <th key={i} scope="col" style={cellStyle(i)}>
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        {block.rows.length > 0 ? (
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i} style={cellStyle(i)}>
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ) : null}
      </table>
    </div>
  );
}

// Render a markdown source string as React elements. The caller wraps it in the
// `.post-body` container, so headings/paragraphs/lists/figures/tables inherit
// the theme's post-body typography — identical to an HTML body. `classPrefix`
// namespaces the one class this renderer emits (the table wrapper).
export const MarkdownBody: FC<{ source: string; classPrefix?: string }> = ({ source, classPrefix = "" }) => {
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
        if (block.type === "table") {
          return <MarkdownTable key={idx} block={block} classPrefix={classPrefix} />;
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
