// v0.5.0: the optional index hero and self-hosted font files. Logic only —
// parsing/validation of the two theme keys, the emitted @font-face rules, the
// byte-compat rule (absent keys change nothing) and the single-<h1> invariant.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostIndex } from "../src/components/posts";
import { fontFaceCss, themeCss } from "../src/theme/css";
import {
  FONT_FILES_MAX,
  FONT_FILE_EXTENSIONS,
  HERO_IMAGE_EXTENSIONS,
  HERO_TITLE_MAX,
  parseFontFiles,
  parseHero,
  parseTheme,
  safePublicPath,
  type FontFile,
} from "../src/theme/schema";

const BASE = { brand_name: "Example Blog", class_prefix: "exb", layout_variant: "journal" };

describe("safePublicPath", () => {
  it("accepts plain relative paths under the site, tolerating one leading slash", () => {
    expect(safePublicPath("fonts/example.woff2", FONT_FILE_EXTENSIONS)).toBe("fonts/example.woff2");
    expect(safePublicPath("/fonts/Example-Bold.WOFF", FONT_FILE_EXTENSIONS)).toBe("fonts/Example-Bold.WOFF");
    expect(safePublicPath("images/hero_1.webp", HERO_IMAGE_EXTENSIONS)).toBe("images/hero_1.webp");
  });

  it("rejects traversal, absolute/protocol-relative URLs and schemes", () => {
    for (const bad of [
      "../fonts/x.woff2",
      "fonts/../../x.woff2",
      "fonts/./x.woff2",
      "//cdn.example.com/x.woff2",
      "https://example.com/x.woff2",
      "http://example.com/x.woff2",
      "data:font/woff2;base64,AAAA.woff2",
      "javascript:alert(1).woff2",
      "C:\\fonts\\x.woff2",
      "fonts//x.woff2",
    ]) {
      expect(safePublicPath(bad, FONT_FILE_EXTENSIONS), bad).toBeNull();
    }
  });

  it("rejects anything that could break out of a CSS url() or the style tag", () => {
    for (const bad of [
      'fonts/x.woff2") ; } body{display:none} /*',
      "fonts/x.woff2)",
      "fonts/x'.woff2",
      "fonts/x y.woff2",
      "fonts/x.woff2;color:red",
      "fonts/x</style>.woff2",
      "fonts/x.woff2?v=1",
      "fonts/x.woff2#frag",
      "fonts/%2e%2e/x.woff2",
      "fonts/x{}.woff2",
    ]) {
      expect(safePublicPath(bad, FONT_FILE_EXTENSIONS), bad).toBeNull();
    }
  });

  it("enforces the extension allow-list", () => {
    expect(safePublicPath("fonts/x.ttf", FONT_FILE_EXTENSIONS)).toBeNull();
    expect(safePublicPath("fonts/x.css", FONT_FILE_EXTENSIONS)).toBeNull();
    expect(safePublicPath("fonts/woff2", FONT_FILE_EXTENSIONS)).toBeNull();
    expect(safePublicPath("fonts/.woff2", FONT_FILE_EXTENSIONS)).toBeNull();
    expect(safePublicPath("images/hero.woff2", HERO_IMAGE_EXTENSIONS)).toBeNull();
    expect(safePublicPath("images/hero.html", HERO_IMAGE_EXTENSIONS)).toBeNull();
  });

  it("rejects non-strings, blanks and over-long paths", () => {
    expect(safePublicPath(42, FONT_FILE_EXTENSIONS)).toBeNull();
    expect(safePublicPath("   ", FONT_FILE_EXTENSIONS)).toBeNull();
    expect(safePublicPath("/", FONT_FILE_EXTENSIONS)).toBeNull();
    expect(safePublicPath(`fonts/${"a".repeat(200)}.woff2`, FONT_FILE_EXTENSIONS)).toBeNull();
  });
});

describe("parseFontFiles", () => {
  it("normalizes valid entries and applies the weight/style defaults", () => {
    expect(
      parseFontFiles([
        { family: "Example Sans", src: "fonts/example-sans.woff2" },
        { family: "Example Sans", src: "/fonts/example-sans-italic.woff", weight: 700, style: "italic" },
        { family: "Example_Var", src: "fonts/var.woff2", weight: "100  900" },
      ]),
    ).toEqual([
      { family: "Example Sans", src: "fonts/example-sans.woff2", weight: "400", style: "normal" },
      { family: "Example Sans", src: "fonts/example-sans-italic.woff", weight: "700", style: "italic" },
      { family: "Example_Var", src: "fonts/var.woff2", weight: "100 900", style: "normal" },
    ]);
  });

  it("drops entries with an unsafe family, src, weight or style (and keeps the rest)", () => {
    const files = parseFontFiles([
      { family: 'X"; } body{display:none} @font-face{font-family:"Y', src: "fonts/x.woff2" },
      { family: "X</style>", src: "fonts/x.woff2" },
      { family: "", src: "fonts/x.woff2" },
      { family: "X", src: "https://fonts.example.com/x.woff2" },
      { family: "X", src: "../x.woff2" },
      { family: "X", src: "fonts/x.otf" },
      { family: "X", src: "fonts/x.woff2", weight: "450" },
      { family: "X", src: "fonts/x.woff2", weight: "900 100" },
      { family: "X", src: "fonts/x.woff2", weight: "400;color:red" },
      { family: "X", src: "fonts/x.woff2", style: "oblique 10deg" },
      "fonts/x.woff2",
      null,
      { family: "Ok", src: "fonts/ok.woff2", weight: "bold" },
    ]);
    expect(files).toEqual([{ family: "Ok", src: "fonts/ok.woff2", weight: "bold", style: "normal" }]);
  });

  it("is [] when absent or not an array, and caps the list", () => {
    expect(parseFontFiles(undefined)).toEqual([]);
    expect(parseFontFiles({ family: "X", src: "fonts/x.woff2" })).toEqual([]);
    const many = Array.from({ length: FONT_FILES_MAX + 5 }, (_, i) => ({ family: "X", src: `fonts/x${i}.woff2` }));
    expect(parseFontFiles(many)).toHaveLength(FONT_FILES_MAX);
  });
});

describe("fontFaceCss + themeCss", () => {
  it("emits one swap @font-face per file with the right format", () => {
    const css = fontFaceCss([
      { family: "Example Sans", src: "fonts/a.woff2", weight: "400", style: "normal" },
      { family: "Example Serif", src: "fonts/b.woff", weight: "700", style: "italic" },
    ]);
    expect(css).toBe(
      '@font-face{font-family:"Example Sans";src:url("/fonts/a.woff2") format("woff2");font-weight:400;font-style:normal;font-display:swap}\n' +
        '@font-face{font-family:"Example Serif";src:url("/fonts/b.woff") format("woff");font-weight:700;font-style:italic;font-display:swap}',
    );
  });

  it("re-validates a hand-built list (an unsafe entry never reaches CSS)", () => {
    const hostile = [{ family: "X", src: 'x.woff2") } body{display:none', weight: "400", style: "normal" }] as FontFile[];
    expect(fontFaceCss(hostile)).toBe("");
  });

  it("prepends the rules to themeCss without the class prefix touching the src", () => {
    const theme = parseTheme({
      ...BASE,
      font_files: [{ family: "Example Sans", src: "fonts/example.woff2" }],
      fonts: { heading: '"Example Sans", Georgia, serif', body: null },
    });
    const css = themeCss(theme);
    expect(css.startsWith('@font-face{font-family:"Example Sans";src:url("/fonts/example.woff2") format("woff2")')).toBe(true);
    expect(css).not.toContain("exb-woff2");
    expect(css).toContain('--font-heading:"Example Sans", Georgia, serif;');
    expect(css).toContain(".exb-post-list");
  });

  it("absent hero + font_files leaves themeCss byte-identical", () => {
    const before = themeCss(parseTheme(BASE));
    expect(themeCss(parseTheme({ ...BASE, hero: null, font_files: [] }))).toBe(before);
    expect(themeCss(parseTheme({ ...BASE, hero: { subtitle: "no title" }, font_files: [{ src: "x.ttf" }] }))).toBe(before);
    expect(before).not.toContain("@font-face");
    expect(before).not.toContain("index-hero");
  });

  it("emits the (prefixed) hero rules only when a hero is set", () => {
    const css = themeCss(parseTheme({ ...BASE, hero: { title: "Welcome" } }));
    expect(css).toContain(".exb-index-hero{");
    expect(css).toContain(".exb-index-hero-center{");
    expect(css).toContain("var(--panel)");
  });
});

describe("parseHero", () => {
  it("is null when absent, not an object, or missing a usable title", () => {
    expect(parseHero(undefined)).toBeNull();
    expect(parseHero("Welcome")).toBeNull();
    expect(parseHero([{ title: "Welcome" }])).toBeNull();
    expect(parseHero({ subtitle: "x" })).toBeNull();
    expect(parseHero({ title: "   " })).toBeNull();
    expect(parseHero({ title: "x".repeat(HERO_TITLE_MAX + 1) })).toBeNull();
    expect(parseTheme(BASE).hero).toBeNull();
    expect(parseTheme(BASE).font_files).toEqual([]);
  });

  it("normalizes a full hero", () => {
    expect(
      parseHero({
        title: " Welcome to Example Blog ",
        subtitle: "Notes and guides.",
        image_key: "/images/hero.jpg",
        image_alt: "A desk",
        cta: { label: "Start here", href: "/posts/start" },
        align: "center",
      }),
    ).toEqual({
      eyebrow: null,
      title: "Welcome to Example Blog",
      subtitle: "Notes and guides.",
      image_key: "images/hero.jpg",
      image_alt: "A desk",
      cta: { label: "Start here", href: "/posts/start" },
      align: "center",
    });
  });

  it("degrades each optional field on its own", () => {
    expect(
      parseHero({
        title: "Welcome",
        subtitle: 7,
        image_key: "https://example.com/hero.jpg",
        cta: { label: "Go", href: "javascript:alert(1)" },
        align: "right",
      }),
    ).toEqual({ eyebrow: null, title: "Welcome", subtitle: null, image_key: null, image_alt: "", cta: null, align: "left" });
    expect(parseHero({ title: "W", image_key: "../secret.png" })?.image_key).toBeNull();
    expect(parseHero({ title: "W", cta: { label: "Go", href: "//example.com" } })?.cta).toBeNull();
    expect(parseHero({ title: "W", cta: { href: "/x" } })?.cta).toBeNull();
    expect(parseHero({ title: "W", cta: { label: "Go", href: "https://example.com/x" } })?.cta).toEqual({
      label: "Go",
      href: "https://example.com/x",
    });
  });
});

describe("PostIndex heading with a hero", () => {
  const site = { authors: [], language: "en" };
  const h1Count = (html: string) => (html.match(/<h1[\s>]/g) ?? []).length;
  const render = (raw: Record<string, unknown>, page: number) =>
    renderToStaticMarkup(createElement(PostIndex, { posts: [], site, theme: parseTheme(raw), page, totalPages: 3 }));

  it("page 1 with a hero has exactly one h1 — the hero title, not the brand name", () => {
    const html = render({ ...BASE, hero: { title: "Welcome" } }, 1);
    expect(h1Count(html)).toBe(1);
    expect(html).toContain(">Welcome</h1>");
    expect(html).not.toContain(">Example Blog");
  });

  it("later pages and hero-less themes keep the single brand-name h1", () => {
    for (const html of [render({ ...BASE, hero: { title: "Welcome" } }, 2), render(BASE, 1)]) {
      expect(h1Count(html)).toBe(1);
      expect(html).toContain("<h1>Example Blog");
      expect(html).not.toContain("index-hero");
    }
  });
});
