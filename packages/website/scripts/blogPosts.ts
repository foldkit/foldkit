import {
  Array,
  Option,
  Record as Record_,
  Schema as S,
  String as String_,
  pipe,
} from 'effect'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseMarkdownWithFrontmatter } from '@foldkit/markdown/vite'

import { islandAttributes } from '../src/markdown/islandAttributes'
import {
  type PostCover,
  PostFrontmatter,
  maybePostCover,
} from '../src/page/blog/frontmatter'
import { byDateThenSlugDescending } from '../src/page/blog/meta'

// COVER ASSETS

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

export const PUBLIC_DIR = resolve(SCRIPT_DIR, '../public')

const COVER_MIME_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
}

export const maybeCoverMimeType = (src: string): Option.Option<string> =>
  pipe(String_.split(src, '.'), Array.lastNonEmpty, extension =>
    Record_.get(COVER_MIME_TYPE_BY_EXTENSION, extension.toLowerCase()),
  )

/**
 * A cover image as the file it serves from: its root-relative path, its MIME
 * type, and its size in bytes. The RSS feed reports all three on each item's
 * `enclosure`.
 */
export type CoverAsset = Readonly<{
  src: string
  mimeType: string
  byteLength: number
}>

const coverAsset = (cover: PostCover): CoverAsset => ({
  src: cover.src,
  mimeType: Option.getOrThrowWith(
    maybeCoverMimeType(cover.src),
    () =>
      new Error(`Cover image ${cover.src} has no recognized image extension.`),
  ),
  byteLength: statSync(join(PUBLIC_DIR, cover.src)).size,
})

// BLOG POSTS

const POST_DIR = resolve(SCRIPT_DIR, '../src/page/blog/post')

export type BlogPostEntry = Readonly<{
  slug: string
  frontmatter: PostFrontmatter
  maybeCoverAsset: Option.Option<CoverAsset>
}>

const decodePostFrontmatter = S.decodeUnknownSync(PostFrontmatter)

const readPostEntry = (fileName: string): BlogPostEntry => {
  const source = readFileSync(join(POST_DIR, fileName), 'utf8')
  const { maybeFrontmatter } = parseMarkdownWithFrontmatter(source, {
    islands: islandAttributes,
    frontmatter: PostFrontmatter,
  })

  const frontmatter = decodePostFrontmatter(
    Option.getOrThrowWith(
      maybeFrontmatter,
      () => new Error(`Blog post ${fileName} has no frontmatter block.`),
    ),
  )

  return {
    slug: basename(fileName, '.md'),
    frontmatter,
    maybeCoverAsset: Option.map(maybePostCover(frontmatter), coverAsset),
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
