// Build-time post loader (Node only — import from "blog-components/content"
// in server code; the main entry stays filesystem-free).
//
// Reads every `<slug>.mdx` in the posts directory, validates its frontmatter
// and returns the parsed posts. Scheduled posts ARE loaded (so their
// frontmatter is still validated on every build) but never rendered: pages go
// through `livePosts` / `isServable`.

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { parseFrontmatter } from "./frontmatter";
import type { Post } from "./types";

export const POST_EXTENSION = ".mdx";

export function parsePostSource(slug: string, source: string): Post {
  const parsed = matter(source);
  return {
    slug,
    frontmatter: parseFrontmatter(parsed.data as Record<string, unknown>, slug),
    html: parsed.content.trim(),
  };
}

export function loadAllPosts(postsDir: string): Post[] {
  if (!fs.existsSync(postsDir)) return [];
  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(POST_EXTENSION))
    .sort()
    .map((file) => {
      const slug = file.slice(0, -POST_EXTENSION.length);
      return parsePostSource(slug, fs.readFileSync(path.join(postsDir, file), "utf-8"));
    });
}

export { isServable, livePosts, paginate } from "./visibility";
export type { Post } from "./types";
