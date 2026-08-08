import { Array, Option, Schema as S, pipe } from 'effect'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseMarkdownWithFrontmatter } from '@foldkit/markdown/vite'

import { islandAttributes } from '../src/markdown/islandAttributes'
import { PostFrontmatter } from '../src/page/blog/frontmatter'
import { byDateThenSlugDescending } from '../src/page/blog/meta'

// BLOG POSTS

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const POST_DIR = resolve(SCRIPT_DIR, '../src/page/blog/post')

export type BlogPostEntry = Readonly<{
  slug: string
  frontmatter: PostFrontmatter
}>

const decodePostFrontmatter = S.decodeUnknownSync(PostFrontmatter)

const readPostEntry = (fileName: string): BlogPostEntry => {
  const source = readFileSync(join(POST_DIR, fileName), 'utf8')
  const { maybeFrontmatter } = parseMarkdownWithFrontmatter(source, {
    islands: islandAttributes,
    frontmatter: PostFrontmatter,
  })

  return {
    slug: basename(fileName, '.md'),
    frontmatter: decodePostFrontmatter(
      Option.getOrThrowWith(
        maybeFrontmatter,
        () => new Error(`Blog post ${fileName} has no frontmatter block.`),
      ),
    ),
  }
}

/**
 * Every blog post's slug and frontmatter, newest first, read from the post
 * markdown sources. This is the node-side mirror of the app's post registry:
 * prerender and metadata run under tsx, which cannot import compiled `.md`
 * modules, so they read the same files the Vite plugin compiles.
 */
export const blogPosts: ReadonlyArray<BlogPostEntry> = pipe(
  readdirSync(POST_DIR),
  Array.filter(fileName => fileName.endsWith('.md')),
  Array.map(readPostEntry),
  Array.sort(byDateThenSlugDescending),
)

export const blogPostSlugs: ReadonlyArray<string> = Array.map(
  blogPosts,
  ({ slug }) => slug,
)
