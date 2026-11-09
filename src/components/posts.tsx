// Post index, pagination, the post page, the FAQ block, author + about pages.
// Pages receive already-filtered LIVE posts; nothing here decides visibility.
//
// Class names are namespaced per site through `classPrefix` (the site's
// `theme.class_prefix`); the default "" keeps them byte-identical.

import type { FaqItem, Post } from "../content/types";
import { authorBySlug, type Author, type SiteConfig } from "../site/schema";
import { authorPath, indexPagePath, postPathFor } from "../seo/urls";
import { classer } from "../theme/classes";
import type { ThemeConfig, ThemeHero } from "../theme/schema";
import { toIsoDate } from "../util";
import { MarkdownBody, resolveBodyFormat } from "../content/markdown";
import { LanguageSwitch, type LanguageSwitchEntry } from "./chrome";
import { PaidPlacementCallout, showPaidPlacement } from "./disclosure";

// A site shape that can resolve a post's URL: its authors (for bylines) plus
// the default `language` (a post in another language is served under /<lang>/).
type PostListSite = Pick<SiteConfig, "authors" | "language">;

// The site shape the post page needs: the list site plus the optional
// sponsor-disclosure config (both null/off on a plain blog).
type PostSite = PostListSite & Pick<SiteConfig, "features" | "sponsor">;

// The post body. The body string is either the publisher's article HTML or a
// hand-written body. SECURITY: an HTML body is injected verbatim — it MUST be
// sanitized BEFORE it is committed (the server is the only trust boundary; this
// package never sees untrusted input and does not re-sanitize). `bodyFormat`
// picks the path; when it is null the format is auto-detected from the body
// (see `resolveBodyFormat`). Both render inside `.post-body`, so the theme's
// typography is identical.
export function PostBody({
  post,
  classPrefix = "",
}: {
  post: Pick<Post, "html" | "frontmatter">;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  const format = resolveBodyFormat(post.frontmatter.bodyFormat, post.html);
  if (format === "markdown") {
    return (
      <div className={c("post-body")}>
        <MarkdownBody source={post.html} />
      </div>
    );
  }
  return <div className={c("post-body")} dangerouslySetInnerHTML={{ __html: post.html }} />;
}

function Byline({ post, site, classPrefix = "" }: { post: Post; site: Pick<SiteConfig, "authors">; classPrefix?: string }) {
  const c = classer(classPrefix);
  const fm = post.frontmatter;
  const author = authorBySlug(site, fm.authorSlug);
  return (
    <p className={c("post-meta")}>
      <time dateTime={fm.publishAt}>{toIsoDate(fm.publishAt)}</time>
      {" · "}
      {author ? <a href={authorPath(author.slug)}>{author.name}</a> : <span>{fm.author}</span>}
    </p>
  );
}

export function PostList({
  posts,
  site,
  classPrefix = "",
}: {
  posts: readonly Post[];
  site: PostListSite;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  if (posts.length === 0) return <p className={c("empty")}>No posts yet.</p>;
  return (
    <ul className={c("post-list")}>
      {posts.map((post) => (
        <li key={post.slug}>
          <h2>
            <a href={postPathFor(post, site.language)}>{post.frontmatter.title}</a>
          </h2>
          <Byline post={post} site={site} classPrefix={classPrefix} />
          {post.frontmatter.description ? <p className={c("excerpt")}>{post.frontmatter.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Pagination({ page, totalPages, classPrefix = "" }: { page: number; totalPages: number; classPrefix?: string }) {
  if (totalPages <= 1) return null;
  const c = classer(classPrefix);
  return (
    <nav className={c("pagination")} aria-label="Pagination">
      {page > 1 ? (
        <a rel="prev" href={indexPagePath(page - 1)}>
          &larr; Newer
        </a>
      ) : (
        <span />
      )}
      {page < totalPages ? (
        <a rel="next" href={indexPagePath(page + 1)}>
          Older &rarr;
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function PostIndex({
  posts,
  site,
  theme,
  page,
  totalPages,
  classPrefix = "",
}: {
  posts: readonly Post[];
  site: PostListSite;
  theme: ThemeConfig;
  page: number;
  totalPages: number;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  // The hero (v0.5.0) opens page 1 only, and its title IS the page's single
  // <h1> — the brand-name heading is not emitted alongside it. Later pages (and
  // a theme with no hero) keep the brand-name heading exactly as before.
  const hero = page <= 1 ? (theme.hero ?? null) : null;
  if (hero) {
    return (
      <>
        <IndexHero hero={hero} classPrefix={classPrefix} />
        <PostList posts={posts} site={site} classPrefix={classPrefix} />
        <Pagination page={page} totalPages={totalPages} classPrefix={classPrefix} />
      </>
    );
  }
  return (
    <>
      <h1>
        {theme.brand_name}
        {page > 1 ? <span className={c("post-meta")}> — page {page}</span> : null}
      </h1>
      <hr className={c("accent-rule")} />
      <PostList posts={posts} site={site} classPrefix={classPrefix} />
      <Pagination page={page} totalPages={totalPages} classPrefix={classPrefix} />
    </>
  );
}

// The blog-index hero block (v0.5.0), rendered by PostIndex from `theme.hero`.
// Every field was validated by parseTheme: the image path is a safe path under
// the site's public dir (served at the root, like the header logo) and the CTA
// href is `/`-relative or `https://` (an external target gets rel="noopener").
// Text renders as escaped text nodes.
export function IndexHero({ hero, classPrefix = "" }: { hero: ThemeHero; classPrefix?: string }) {
  const c = classer(classPrefix);
  const imageSrc = hero.image_key ? `/${hero.image_key}` : null;
  const cta = hero.cta;
  return (
    <section
      className={c("index-hero", `index-hero-${hero.align}`, imageSrc ? "index-hero-has-image" : "")}
      aria-labelledby="index-hero-title"
    >
      <div className={c("index-hero-text")}>
        <h1 id="index-hero-title">{hero.title}</h1>
        {hero.subtitle ? <p className={c("index-hero-subtitle")}>{hero.subtitle}</p> : null}
        {cta ? (
          <p className={c("index-hero-cta")}>
            <a className={c("btn")} href={cta.href} rel={cta.href.startsWith("https://") ? "noopener" : undefined}>
              {cta.label}
            </a>
          </p>
        ) : null}
      </div>
      {imageSrc ? <img className={c("index-hero-image")} src={imageSrc} alt={hero.image_alt} /> : null}
    </section>
  );
}

// The visible FAQ block, with the same markup the publisher writes into
// generated post bodies (`section.post-faq > h2 + dl`).
export function FaqBlock({
  items,
  heading = "Frequently asked questions",
  classPrefix = "",
}: {
  items: readonly FaqItem[];
  heading?: string;
  classPrefix?: string;
}) {
  if (items.length === 0) return null; // never an empty FAQ
  const c = classer(classPrefix);
  return (
    <section className={c("post-faq")} aria-label={heading}>
      <h2>{heading}</h2>
      <dl>
        {items.map((item) => (
          <div key={item.question}>
            <dt>{item.question}</dt>
            <dd>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// The post page. When the site runs the sponsor-disclosure layer and this post
// features a paid brand, the paid-placement callout renders above the byline.
export function PostArticle({
  post,
  site,
  languageSwitch = [],
  classPrefix = "",
}: {
  post: Post;
  site: PostSite;
  // The post's live siblings in other languages (empty on a monolingual post).
  // When non-empty, a "read in other languages" switch renders above the title.
  languageSwitch?: readonly LanguageSwitchEntry[];
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  const fm = post.frontmatter;
  return (
    <article className={c("post")}>
      {languageSwitch.length > 1 ? (
        <LanguageSwitch entries={languageSwitch} ariaLabel="Read in another language" classPrefix={classPrefix} />
      ) : null}
      {showPaidPlacement(site, fm) && site.sponsor ? (
        <PaidPlacementCallout
          paidBrands={fm.paidBrands}
          otherBrands={fm.otherBrands}
          disclosurePath={site.sponsor.disclosurePath}
          classPrefix={classPrefix}
        />
      ) : null}
      <h1>{fm.title}</h1>
      {fm.description ? <p className={c("post-description")}>{fm.description}</p> : null}
      <Byline post={post} site={site} classPrefix={classPrefix} />
      <hr className={c("accent-rule")} />
      {fm.coverImage ? (
        <figure className={c("hero")}>
          <img src={fm.coverImage} alt={fm.coverImageAlt ?? ""} />
        </figure>
      ) : null}
      <PostBody post={post} classPrefix={classPrefix} />
      <FaqBlock items={fm.faq} classPrefix={classPrefix} />
    </article>
  );
}

export function AuthorsIndex({ authors, classPrefix = "" }: { authors: readonly Author[]; classPrefix?: string }) {
  const c = classer(classPrefix);
  return (
    <>
      <h1>Authors</h1>
      <hr className={c("accent-rule")} />
      <ul className={c("post-list")}>
        {authors.map((author) => (
          <li key={author.slug}>
            <h2>
              <a href={authorPath(author.slug)}>{author.name}</a>
            </h2>
            {author.title ? <p className={c("post-meta")}>{author.title}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export function AuthorProfile({
  author,
  posts,
  site,
  classPrefix = "",
}: {
  author: Author;
  posts: readonly Post[];
  site: PostListSite;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  return (
    <>
      <h1>{author.name}</h1>
      {author.title ? <p className={c("post-meta")}>{author.title}</p> : null}
      <hr className={c("accent-rule")} />
      {author.bio ? <p className={c("author-bio")}>{author.bio}</p> : null}
      {author.expertise.length > 0 ? (
        <section className={c("author-expertise")}>
          <h2>Areas of expertise</h2>
          <ul>
            {author.expertise.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <h2>Posts</h2>
      <PostList posts={posts} site={site} classPrefix={classPrefix} />
    </>
  );
}

// About page. `about_text` is plain text from the theme editor (paragraphs
// split on blank lines), rendered as text — never as HTML.
export function AboutContent({
  theme,
  site,
  classPrefix = "",
}: {
  theme: ThemeConfig;
  site: Pick<SiteConfig, "description">;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  const paragraphs = (theme.about_text ?? site.description ?? `${theme.brand_name} publishes here.`)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      <h1>About {theme.brand_name}</h1>
      <hr className={c("accent-rule")} />
      <div className={c("about-body")}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className={c("post-meta")}>
        Articles here are researched and drafted with AI assistance and reviewed by the named author before
        publishing.
      </p>
      {theme.contact_email ? <p className={c("post-meta")}>Contact: {theme.contact_email}</p> : null}
    </>
  );
}
