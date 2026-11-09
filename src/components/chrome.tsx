// Site chrome: theme <style>, JSON-LD script, header, footer and the shell
// that wraps every page. Every chrome link is same-host relative. On a plain
// blog (the default) there is no "powered by" mark, no sponsored link and no
// disclosure banner. A sponsor-disclosure site (opt-in `features`) additionally
// mounts the banner, the footer attribution line and a /disclosure nav entry —
// see `./disclosure`.
//
// Class names are namespaced per site through `theme.class_prefix` (passed as
// `classPrefix`), so independently-published sites do not share identical
// markup. The default "" prefix keeps class names byte-identical.

import type { CSSProperties, ReactNode } from "react";

import { dirForLang } from "../content/languages";
import type { SiteConfig } from "../site/schema";
import { classer } from "../theme/classes";
import { resolveLayout, themeCss } from "../theme/css";
import { LOGO_MARK_EXTENSIONS, safePublicPath, type ThemeConfig } from "../theme/schema";
import { jsonLdSafe } from "../util";
import { DisclosureBanner, showSponsorBanner, SponsorAttribution } from "./disclosure";

// The chrome needs only the disclosure-relevant slice of the site config. It is
// optional so a plain blog can keep calling the chrome with no site at all.
type ChromeSite = Pick<SiteConfig, "features" | "sponsor"> | undefined;

export function ThemeStyle({ theme }: { theme: ThemeConfig }) {
  return <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />;
}

export function JsonLd({ data }: { data: readonly Record<string, unknown>[] }) {
  return (
    <>
      {data.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(block) }} />
      ))}
    </>
  );
}

// Attributes for the root <html> element (the app's root layout renders it).
// `lang` is the language of the page being rendered — the site default for the
// default-language routes, or the page's language under `/<lang>/…`; `dir` is
// derived from it (rtl for ar/he/fa/ur). The layout/header/post variant
// attributes drive the per-site layout CSS. Accepts either a bare BCP-47 tag
// or a site-like `{ language }` object (so existing call sites keep working).
export function htmlAttributes(
  lang: string | Pick<SiteConfig, "language">,
  theme: Pick<ThemeConfig, "layout_variant" | "header_variant" | "post_variant">,
) {
  const tag = typeof lang === "string" ? lang : lang.language;
  return {
    lang: tag,
    dir: dirForLang(tag),
    "data-layout": resolveLayout(theme),
    "data-header": theme.header_variant,
    "data-post": theme.post_variant,
  } as const;
}

// One entry in the language switcher: a language tag, the URL to switch to, and
// whether it is the page's current language (rendered as plain text, not a
// link). The visible label is the tag uppercased ("ES", "JA").
export interface LanguageSwitchEntry {
  lang: string;
  href: string;
  current?: boolean;
}

// The language switcher: links (or pills) to the other languages of the site /
// post. Renders nothing for a single-language site (<= 1 entry), so a plain
// blog that carries a `language_switch` nav entry shows nothing until it has a
// second language.
export function LanguageSwitch({
  entries,
  style = null,
  ariaLabel = "Language",
  placement = "nav",
  classPrefix = "",
}: {
  entries: readonly LanguageSwitchEntry[];
  style?: "pill" | null;
  ariaLabel?: string;
  // "nav" (default): styled by the header stylesheet (emitted only when the
  // theme has a `language_switch` nav entry). "post" (v0.6.1): the switch a
  // post page renders above its title — it appears on any site with
  // translated posts, whatever the theme, so it carries its own inline styles
  // (separate >= 44px tap targets, current language filled) rather than adding
  // rules to every site's stylesheet.
  placement?: "nav" | "post";
  classPrefix?: string;
}) {
  if (entries.length <= 1) return null;
  const c = classer(classPrefix);
  const pill = style === "pill" ? c("nav-pill") : undefined;
  const inline = placement === "post";
  return (
    <span
      className={c("language-switch")}
      role="group"
      aria-label={ariaLabel}
      style={inline ? POST_SWITCH_STYLE : undefined}
    >
      {entries.map((entry) => {
        const label = entry.lang.toUpperCase();
        return entry.current ? (
          <span key={entry.lang} className={pill} aria-current="true" style={inline ? POST_SWITCH_CURRENT_STYLE : undefined}>
            {label}
          </span>
        ) : (
          <a
            key={entry.lang}
            className={pill}
            href={entry.href}
            hrefLang={entry.lang}
            style={inline ? POST_SWITCH_ENTRY_STYLE : undefined}
          >
            {label}
          </a>
        );
      })}
    </span>
  );
}

// Inline styles for the post-page switch (placement "post"). Colors are the
// surface tokens, so it follows a dark surface; the current entry is ink-on-bg
// inverted, which the surface guard keeps at >= 4.5:1.
const POST_SWITCH_STYLE: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "8px", margin: "18px 0 4px" };
const POST_SWITCH_ENTRY_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  minHeight: "44px",
  padding: "0 14px",
  border: "1px solid currentColor",
  borderRadius: "999px",
  color: "var(--ink)",
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: ".04em",
};
const POST_SWITCH_CURRENT_STYLE: CSSProperties = {
  ...POST_SWITCH_ENTRY_STYLE,
  background: "var(--ink)",
  borderColor: "var(--ink)",
  color: "var(--bg)",
};

// The logo mark's site-root src (v0.6.0), re-validated as a safe public image
// path so a hand-built theme cannot point it off-site. Null = no mark.
function logoMarkSrc(theme: Partial<Pick<ThemeConfig, "logo_mark_key">>): string | null {
  const path = safePublicPath(theme.logo_mark_key, LOGO_MARK_EXTENSIONS);
  return path ? `/${path}` : null;
}

export function SiteHeader({
  theme,
  site,
  languageSwitch = [],
  classPrefix = "",
}: {
  theme: ThemeConfig;
  site?: ChromeSite;
  // The entries a `language_switch` nav entry renders (the site's languages, or
  // a post's siblings). Empty on a single-language site, so the switcher is
  // hidden. Threaded from the layout/page; the header has no page context.
  languageSwitch?: readonly LanguageSwitchEntry[];
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  const logoSrc = theme.logo_key ? `/${theme.logo_key.replace(/^\/+/, "")}` : null;
  const sponsor = site && showSponsorBanner(site) ? site.sponsor : null;
  const navLinks = theme.nav_links ?? [];
  // The brand link points at `logo_href` when set (validated like a nav href),
  // else home. An external https target gets rel="noopener"; the aria-label is
  // always "<brand> home".
  const brandHref = theme.logo_href ?? "/";
  const brandRel = brandHref.startsWith("https://") ? "noopener" : undefined;
  // An explicit logo_width drives the size from CSS (width + height:auto), so
  // the intrinsic height attribute is dropped; without it the logo keeps its
  // default 40px height via the explicit attribute, exactly as before.
  const logoWidth = theme.logo_width ?? null;
  // The optional logo mark (v0.6.0) sits before the TEXT wordmark only — a
  // full `logo_key` image already is the brand. Decorative (alt=""): the link
  // is named by its aria-label.
  const markSrc = logoMarkSrc(theme);
  return (
    <header className={c("site-header")}>
      <div className={c("wrap")}>
        <div className={c("brand")}>
          <a href={brandHref} aria-label={`${theme.brand_name} home`} rel={brandRel}>
            {logoSrc ? (
              logoWidth ? (
                <img className={c("logo")} src={logoSrc} alt={theme.brand_name} />
              ) : (
                <img className={c("logo")} src={logoSrc} alt={theme.brand_name} height={40} />
              )
            ) : markSrc ? (
              <>
                <img className={c("logo-mark")} src={markSrc} alt="" height={28} />
                <span className={c("name")}>{theme.brand_name}</span>
              </>
            ) : (
              <span className={c("name")}>{theme.brand_name}</span>
            )}
          </a>
          {theme.tagline ? <span className={c("tagline")}>{theme.tagline}</span> : null}
        </div>
        <nav className={c("site-nav")} aria-label="Primary">
          {navLinks.length > 0 ? (
            navLinks.map((link, i) =>
              link.type === "language_switch" ? (
                <LanguageSwitch key={i} entries={languageSwitch} style={link.style} classPrefix={classPrefix} />
              ) : (
                <a
                  key={i}
                  href={link.href}
                  className={link.style === "pill" ? c("nav-pill") : undefined}
                  rel={link.href.startsWith("https://") ? "noopener" : undefined}
                >
                  {link.label}
                </a>
              ),
            )
          ) : (
            <>
              <a href="/">Home</a>
              <a href="/about">About</a>
              <a href="/authors">Authors</a>
            </>
          )}
          {sponsor ? <a href={sponsor.disclosurePath}>Disclosure</a> : null}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({
  theme,
  year,
  site,
  classPrefix = "",
}: {
  theme: ThemeConfig;
  year: number;
  site?: ChromeSite;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  const sponsor = site && showSponsorBanner(site) ? site.sponsor : null;
  // v0.6.0: a logo mark adds a mark + wordmark row; `footer_tagline` adds a
  // line under it. Neither set = the v0.5.0 footer.
  const markSrc = logoMarkSrc(theme);
  return (
    <footer className={c("site-footer")}>
      <div className={c("wrap")}>
        {markSrc ? (
          <p className={c("footer-brand")}>
            <img className={c("logo-mark")} src={markSrc} alt="" height={22} />
            <span className={c("footer-name")}>{theme.brand_name}</span>
          </p>
        ) : null}
        {theme.footer_tagline ? <p className={c("footer-tagline")}>{theme.footer_tagline}</p> : null}
        {sponsor ? <SponsorAttribution siteName={theme.brand_name} sponsor={sponsor} classPrefix={classPrefix} /> : null}
        <p>
          &copy; {year} {theme.brand_name}.{" "}
          {theme.contact_email ? <span className={c("contact")}>Contact: {theme.contact_email}</span> : null}{" "}
          <a href="/feed.xml">RSS</a>
          {sponsor ? (
            <>
              {" "}
              <a href={sponsor.disclosurePath}>Disclosure</a> <a href={sponsor.aboutPath}>About</a>
            </>
          ) : null}
        </p>
      </div>
    </footer>
  );
}

// Header + <main> + footer. `year` is passed in (the build's year) so the
// component stays pure. A sponsor-disclosure site also mounts the site-wide
// banner above the header.
export function SiteShell({
  theme,
  year,
  children,
  site,
  languageSwitch = [],
  classPrefix = "",
}: {
  theme: ThemeConfig;
  year: number;
  children: ReactNode;
  site?: ChromeSite;
  languageSwitch?: readonly LanguageSwitchEntry[];
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  const sponsor = site && showSponsorBanner(site) ? site.sponsor : null;
  return (
    <>
      <a className={c("skip-link")} href="#content">
        Skip to content
      </a>
      {sponsor ? <DisclosureBanner siteName={theme.brand_name} sponsor={sponsor} classPrefix={classPrefix} /> : null}
      <SiteHeader theme={theme} site={site} languageSwitch={languageSwitch} classPrefix={classPrefix} />
      <main className={c("wrap")} id="content">
        {children}
      </main>
      <SiteFooter theme={theme} year={year} site={site} classPrefix={classPrefix} />
    </>
  );
}
