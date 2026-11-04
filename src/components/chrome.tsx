// Site chrome: theme <style>, JSON-LD script, header, footer and the shell
// that wraps every page. Every chrome link is same-host relative; there is no
// "powered by" mark, no sponsored link and no disclosure banner — this is the
// customer's own blog.

import type { ReactNode } from "react";

import type { SiteConfig } from "../site/schema";
import { resolveLayout, themeCss } from "../theme/css";
import type { ThemeConfig } from "../theme/schema";
import { jsonLdSafe } from "../util";

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
export function htmlAttributes(site: Pick<SiteConfig, "language">, theme: ThemeConfig) {
  return { lang: site.language, "data-layout": resolveLayout(theme) } as const;
}

export function SiteHeader({ theme }: { theme: ThemeConfig }) {
  const logoSrc = theme.logo_key ? `/${theme.logo_key.replace(/^\/+/, "")}` : null;
  return (
    <header className="site-header">
      <div className="wrap">
        <div className="brand">
          <a href="/" aria-label={`${theme.brand_name} home`}>
            {logoSrc ? (
              <img className="logo" src={logoSrc} alt={theme.brand_name} height={40} />
            ) : (
              <span className="name">{theme.brand_name}</span>
            )}
          </a>
          {theme.tagline ? <span className="tagline">{theme.tagline}</span> : null}
        </div>
        <nav className="site-nav" aria-label="Primary">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/authors">Authors</a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ theme, year }: { theme: ThemeConfig; year: number }) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          &copy; {year} {theme.brand_name}.{" "}
          {theme.contact_email ? <span className="contact">Contact: {theme.contact_email}</span> : null}{" "}
          <a href="/feed.xml">RSS</a>
        </p>
      </div>
    </footer>
  );
}

// Header + <main> + footer. `year` is passed in (the build's year) so the
// component stays pure.
export function SiteShell({ theme, year, children }: { theme: ThemeConfig; year: number; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <SiteHeader theme={theme} />
      <main className="wrap" id="content">
        {children}
      </main>
      <SiteFooter theme={theme} year={year} />
    </>
  );
}
