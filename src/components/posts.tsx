// Post index, pagination, the post page, the FAQ block, author + about pages.
// Pages receive already-filtered LIVE posts; nothing here decides visibility.

import type { FaqItem, Post } from "../content/types";
import { authorBySlug, type Author, type SiteConfig } from "../site/schema";
import { authorPath, indexPagePath, postPath } from "../seo/urls";
import type { ThemeConfig } from "../theme/schema";
import { toIsoDate } from "../util";

function Byline({ post, site }: { post: Post; site: Pick<SiteConfig, "authors"> }) {
  const fm = post.frontmatter;
  const author = authorBySlug(site, fm.authorSlug);
  return (
    <p className="post-meta">
      <time dateTime={fm.publishAt}>{toIsoDate(fm.publishAt)}</time>
      {" · "}
      {author ? <a href={authorPath(author.slug)}>{author.name}</a> : <span>{fm.author}</span>}
    </p>
  );
}

export function PostList({ posts, site }: { posts: readonly Post[]; site: Pick<SiteConfig, "authors"> }) {
  if (posts.length === 0) return <p className="empty">No posts yet.</p>;
  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.slug}>
          <h2>
            <a href={postPath(post.slug)}>{post.frontmatter.title}</a>
          </h2>
          <Byline post={post} site={site} />
          {post.frontmatter.description ? <p className="excerpt">{post.frontmatter.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
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
}: {
  posts: readonly Post[];
  site: Pick<SiteConfig, "authors">;
  theme: ThemeConfig;
  page: number;
  totalPages: number;
}) {
  return (
    <>
      <h1>
        {theme.brand_name}
        {page > 1 ? <span className="post-meta"> — page {page}</span> : null}
      </h1>
      <hr className="accent-rule" />
      <PostList posts={posts} site={site} />
      <Pagination page={page} totalPages={totalPages} />
    </>
  );
}

// The visible FAQ block, with the same markup the publisher writes into
// generated post bodies (`section.post-faq > h2 + dl`).
export function FaqBlock({ items, heading = "Frequently asked questions" }: { items: readonly FaqItem[]; heading?: string }) {
  if (items.length === 0) return null; // never an empty FAQ
  return (
    <section className="post-faq" aria-label={heading}>
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

// The post page body. `post.html` is the publisher's sanitized article HTML
// (or a hand-written HTML body) committed to the blog's own private repo; it is
// rendered as-is, like the hosted renderer does.
export function PostArticle({ post, site }: { post: Post; site: Pick<SiteConfig, "authors"> }) {
  const fm = post.frontmatter;
  return (
    <article className="post">
      <h1>{fm.title}</h1>
      {fm.description ? <p className="post-description">{fm.description}</p> : null}
      <Byline post={post} site={site} />
      <hr className="accent-rule" />
      {fm.coverImage ? (
        <figure className="hero">
          <img src={fm.coverImage} alt={fm.coverImageAlt ?? ""} />
        </figure>
      ) : null}
      <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />
      <FaqBlock items={fm.faq} />
    </article>
  );
}

export function AuthorsIndex({ authors }: { authors: readonly Author[] }) {
  return (
    <>
      <h1>Authors</h1>
      <hr className="accent-rule" />
      <ul className="post-list">
        {authors.map((author) => (
          <li key={author.slug}>
            <h2>
              <a href={authorPath(author.slug)}>{author.name}</a>
            </h2>
            {author.title ? <p className="post-meta">{author.title}</p> : null}
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
}: {
  author: Author;
  posts: readonly Post[];
  site: Pick<SiteConfig, "authors">;
}) {
  return (
    <>
      <h1>{author.name}</h1>
      {author.title ? <p className="post-meta">{author.title}</p> : null}
      <hr className="accent-rule" />
      {author.bio ? <p className="author-bio">{author.bio}</p> : null}
      <h2>Posts</h2>
      <PostList posts={posts} site={site} />
    </>
  );
}

// About page. `about_text` is plain text from the theme editor (paragraphs
// split on blank lines), rendered as text — never as HTML.
export function AboutContent({ theme, site }: { theme: ThemeConfig; site: Pick<SiteConfig, "description"> }) {
  const paragraphs = (theme.about_text ?? site.description ?? `${theme.brand_name} publishes here.`)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      <h1>About {theme.brand_name}</h1>
      <hr className="accent-rule" />
      <div className="about-body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="post-meta">
        Articles here are researched and drafted with AI assistance and reviewed by the named author before
        publishing.
      </p>
      {theme.contact_email ? <p className="post-meta">Contact: {theme.contact_email}</p> : null}
    </>
  );
}
