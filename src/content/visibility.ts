// Which posts a build renders. The rule is the same one the hosted renderer
// applies at request time, applied here once at BUILD time:
//
//   a post is live ⇔ status === "published" AND publishAt <= buildTime
//
// `status` is the app database's verdict (the API commits "scheduled" at
// generation and flips it to "published" — a new commit, so a new Pages build —
// at the publish transition). `publishAt` is a safety net so a mis-stamped post
// still cannot appear before its time. Fail-closed: a missing/unknown status or
// an unparseable publishAt is NOT live. Unlike the hosted renderer there is no
// legacy "absent status = published" default — every post in a repo is written
// under this contract.

import type { Post, PostFrontmatter } from "./types";

export function isServable(
  frontmatter: Pick<PostFrontmatter, "status" | "publishAt">,
  now: Date,
): boolean {
  if (frontmatter.status !== "published") return false;
  const t = Date.parse(frontmatter.publishAt);
  if (Number.isNaN(t)) return false;
  return t <= now.getTime();
}

// Live posts, newest first by publishAt.
export function livePosts(posts: readonly Post[], now: Date): Post[] {
  return posts
    .filter((p) => isServable(p.frontmatter, now))
    .sort((a, b) => Date.parse(b.frontmatter.publishAt) - Date.parse(a.frontmatter.publishAt));
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  totalPages: number;
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clamped = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (clamped - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: clamped, totalPages };
}
