import {
  Array,
  DateTime,
  Option,
  Record as Record_,
  Schema as S,
  String as String_,
  pipe,
} from 'effect'

import { PostFrontmatter } from './frontmatter'
import { byDateThenSlugDescending } from './meta'

// POSTS

const documentByPath = import.meta.glob<unknown>('./post/*.md', {
  eager: true,
  import: 'default',
})

const frontmatterByPath = import.meta.glob<unknown>('./post/*.md', {
  eager: true,
  import: 'frontmatter',
})

/**
 * A blog post: its slug, its decoded frontmatter, and its compiled markdown
 * document. The document stays encoded here; the post page view turns it into
 * rendered prose. Keeping this module free of the view layer lets tests and
 * the app shell read post metadata without entering the render import graph.
 */
export type BlogPost = Readonly<{
  slug: string
  frontmatter: PostFrontmatter
  document: unknown
}>

const decodePostFrontmatter = S.decodeUnknownSync(PostFrontmatter)

const pathToSlug = (path: string): string =>
  pipe(path, String_.replace('./post/', ''), String_.replace(/\.md$/, ''))

// NOTE: the plugin emits `frontmatter` as `undefined` for a document with no
// frontmatter block, so the glob has the key with an undefined value rather
// than no key. Both spellings mean the post declared no frontmatter.
const maybePostFrontmatter = (path: string): Option.Option<{}> =>
  Option.flatMap(Record_.get(frontmatterByPath, path), Option.fromNullishOr)

const toBlogPost = (path: string, document: unknown): BlogPost => ({
  slug: pathToSlug(path),
  frontmatter: decodePostFrontmatter(
    Option.getOrThrowWith(
      maybePostFrontmatter(path),
      () => new Error(`Blog post ${path} has no frontmatter block.`),
    ),
  ),
  document,
})

/** Every blog post, newest first. */
export const posts: ReadonlyArray<BlogPost> = pipe(
  Object.entries(documentByPath),
  Array.map(([path, document]) => toBlogPost(path, document)),
  Array.sort(byDateThenSlugDescending),
)

/** Looks up a post by the slug in its URL. */
export const findPostBySlug = (slug: string): Option.Option<BlogPost> =>
  Array.findFirst(posts, post => post.slug === slug)

/** Formats a post's `YYYY-MM-DD` date for display, e.g. `August 1, 2026`. */
export const formatPostDate = (date: string): string =>
  Option.match(DateTime.make(date), {
    onNone: () => date,
    onSome: dateTime =>
      DateTime.formatUtc(dateTime, { dateStyle: 'long', locale: 'en-US' }),
  })
