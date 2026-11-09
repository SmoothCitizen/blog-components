// v0.6.0 markdown fixes: inline code spans and GFM pipe tables, plus link
// targets that can never carry a script URL. Logic only — the parsed block
// structure and the escaping/structure of the rendered output.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MarkdownBody,
  TABLE_MIN_COLUMN_EM,
  isSafeLinkHref,
  parseMarkdownBlocks,
  renderInline,
  splitTableRow,
  tableAlignments,
} from "../src/content/markdown";
import { PostBody } from "../src/components/posts";

const md = (source: string, classPrefix?: string) => renderToStaticMarkup(createElement(MarkdownBody, { source, classPrefix }));
const inline = (text: string) => renderToStaticMarkup(createElement("p", null, renderInline(text)));

describe("inline code", () => {
  it("renders a backtick span as <code>", () => {
    expect(inline("Run `npm test` now")).toBe("<p>Run <code>npm test</code> now</p>");
    expect(inline("``a`b``")).toBe("<p><code>a`b</code></p>");
    expect(inline("`` `x` ``")).toBe("<p><code>`x`</code></p>");
  });

  it("keeps code content literal: no emphasis or links inside, escaped HTML", () => {
    expect(inline("`*not italic* and **not bold**`")).toBe("<p><code>*not italic* and **not bold**</code></p>");
    expect(inline("`[x](/y)`")).toBe("<p><code>[x](/y)</code></p>");
    expect(inline("`<script>alert(1)</script>`")).toBe("<p><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></p>");
    expect(inline("`a & b`")).toBe("<p><code>a &amp; b</code></p>");
  });

  it("works inside emphasis, links and alongside them", () => {
    expect(inline("**use `x`** and *`y`*")).toBe("<p><strong>use <code>x</code></strong> and <em><code>y</code></em></p>");
    expect(inline("see [the `run` docs](/docs) or `z`")).toBe(
      '<p>see <a href="/docs">the <code>run</code> docs</a> or <code>z</code></p>',
    );
  });

  it("an unmatched backtick stays text; private-use sentinels in the source are stripped", () => {
    expect(inline("a ` b")).toBe("<p>a ` b</p>");
    expect(inline("x0y")).toBe("<p>x0y</p>");
  });
});

describe("link targets", () => {
  it("script-capable schemes render the label as plain text, never a link", () => {
    for (const href of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:x", "java\tscript:x", "data:text/html,x", "vbscript:x"]) {
      expect(isSafeLinkHref(href), href).toBe(false);
    }
    expect(inline("[click](javascript:alert(1))")).not.toContain("<a");
    expect(inline("[click](javascript:alert(1))")).toContain("click");
    for (const href of ["/x", "https://example.com", "#top", "mailto:a@example.com", "relative/path"]) {
      expect(isSafeLinkHref(href), href).toBe(true);
    }
  });
});

describe("GFM tables", () => {
  const TABLE = ["| Plan | Price | Notes |", "| :--- | ---: | :-: |", "| Basic | $5 | `starter` |", "| Pro | $20 |"].join("\n");

  it("parses header, alignments and rows (short rows padded)", () => {
    expect(parseMarkdownBlocks(TABLE)).toEqual([
      {
        type: "table",
        align: ["left", "right", "center"],
        header: ["Plan", "Price", "Notes"],
        rows: [
          ["Basic", "$5", "`starter`"],
          ["Pro", "$20", ""],
        ],
      },
    ]);
  });

  it("splits rows on unescaped pipes, with or without outer pipes; extra cells are dropped", () => {
    expect(splitTableRow("| a | b |")).toEqual(["a", "b"]);
    expect(splitTableRow("a | b")).toEqual(["a", "b"]);
    expect(splitTableRow("| a \\| b | c |")).toEqual(["a | b", "c"]);
    const blocks = parseMarkdownBlocks("a | b\n--- | ---\n1 | 2 | 3");
    expect(blocks).toEqual([{ type: "table", align: [null, null], header: ["a", "b"], rows: [["1", "2"]] }]);
  });

  it("is not a table without a matching delimiter row", () => {
    expect(tableAlignments("---")).toBeNull();
    expect(tableAlignments("| a | b |")).toBeNull();
    expect(tableAlignments("| -- | x |")).toBeNull();
    expect(parseMarkdownBlocks("a | b\n| --- |")).toEqual([{ type: "paragraph", text: "a | b | --- |" }]);
    expect(parseMarkdownBlocks("Just a | pipe in prose.")).toEqual([{ type: "paragraph", text: "Just a | pipe in prose." }]);
  });

  it("ends at a blank line or a line without a pipe, and interrupts a paragraph", () => {
    const blocks = parseMarkdownBlocks("Intro line\n| a | b |\n|---|---|\n| 1 | 2 |\nAfter.\n\n## Next");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "table", "paragraph", "heading"]);
    expect(blocks[2]).toEqual({ type: "paragraph", text: "After." });
  });

  it("renders thead/tbody in a focusable, horizontally scrolling wrapper", () => {
    const out = md(TABLE);
    expect(out).toContain(
      `<div class="table-wrap" role="region" aria-label="Table" tabindex="0" style="overflow-x:auto"><table style="min-width:${3 * TABLE_MIN_COLUMN_EM}em"><thead><tr>`,
    );
    expect(out).toContain('<th scope="col" style="text-align:left">Plan</th>');
    expect(out).toContain('<td style="text-align:right">$5</td>');
    expect(out).toContain('<td style="text-align:center"><code>starter</code></td>');
    expect(out).toContain("</tr></tbody></table></div>");
    // a header-only table has no tbody
    expect(md("| a |\n| - |")).not.toContain("<tbody>");
  });

  it("escapes cell content (no HTML injection) and prefixes the wrapper class", () => {
    const out = md('| x |\n|---|\n| <img src=x onerror="alert(1)"> **b** |', "exb");
    expect(out).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; <strong>b</strong>");
    expect(out).not.toContain("<img");
    expect(out).toContain('<div class="exb-table-wrap"');
  });

  it("PostBody passes the class prefix to a markdown body", () => {
    const post = { html: "| a |\n|---|\n| 1 |", frontmatter: { bodyFormat: "markdown" as const } };
    expect(renderToStaticMarkup(createElement(PostBody, { post: post as never, classPrefix: "exb" }))).toContain(
      '<div class="exb-post-body"><div class="exb-table-wrap"',
    );
  });
});
