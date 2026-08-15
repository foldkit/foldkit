import { Array, Option, Schema as S, pipe } from 'effect'
import { imageSize } from 'image-size'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

import { BLOG_POST_SLUG_PATTERN } from '../../route'
import { PostFrontmatter, maybePostCover } from './frontmatter'
import { byDateThenSlugDescending } from './meta'
import { findPostBySlug, formatPostDate, posts } from './posts'

const rawSources = import.meta.glob<string>('./post/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('post registry', () => {
  test('finds at least one post', () => {
    expect(Array.isReadonlyArrayNonEmpty(posts)).toBe(true)
  })

  test('slugs are unique', () => {
    const slugs = posts.map(post => post.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  test('posts are ordered newest first', () => {
    const dates = posts.map(post => post.frontmatter.date)
    const newestFirst = [...dates].sort().reverse()

    expect(dates).toEqual(newestFirst)
  })

  test.each(posts.map(post => post.slug))(
    'findPostBySlug resolves %s',
    slug => {
      expect(Option.isSome(findPostBySlug(slug))).toBe(true)
    },
  )

  test('findPostBySlug misses an unknown slug', () => {
    expect(Option.isNone(findPostBySlug('not-a-post'))).toBe(true)
  })

  test.each(posts.map(post => post.slug))(
    '%s stays within the blog post route segment',
    slug => {
      expect(slug).toMatch(BLOG_POST_SLUG_PATTERN)
    },
  )
})

describe('byDateThenSlugDescending', () => {
  test('sorts newest first, breaking date ties by slug descending', () => {
    const sorted = Array.sort(
      [
        { slug: 'alpha', frontmatter: { date: '2026-08-01' } },
        { slug: 'beta', frontmatter: { date: '2026-08-01' } },
        { slug: 'older', frontmatter: { date: '2026-07-01' } },
        { slug: 'newest', frontmatter: { date: '2026-08-02' } },
      ],
      byDateThenSlugDescending,
    )

    expect(Array.map(sorted, post => post.slug)).toEqual([
      'newest',
      'beta',
      'alpha',
      'older',
    ])
  })
})

// NOTE: a post's title renders from its frontmatter, so an `# h1` in the body
// would produce a second page title. The check reads the raw sources because
// the compiled modules no longer carry the frontmatter block to distinguish
// the two.
describe('post sources', () => {
  const sourceEntries = Object.entries(rawSources)

  test('finds at least one post source', () => {
    expect(Array.isReadonlyArrayNonEmpty(sourceEntries)).toBe(true)
  })

  test.each(sourceEntries)(
    '%s opens with a frontmatter block and has no h1 heading',
    (_path, source) => {
      expect(source.startsWith('---\n')).toBe(true)
      expect(source).not.toMatch(/^# /m)
    },
  )
})

// NOTE: happy-dom replaces the global URL constructor and resolves
// `new URL(relative, base)` against its own http document base, dropping the
// file scheme. Anchor through `fileURLToPath(import.meta.url)` directly.
describe('post covers', () => {
  const PUBLIC_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../public',
  )

  const declaredCovers = pipe(
    posts,
    Array.map(post =>
      Option.map(maybePostCover(post.frontmatter), cover => ({
        slug: post.slug,
        cover,
      })),
    ),
    Array.getSomes,
  )

  test('every declared cover file exists in public/', () => {
    for (const { slug, cover } of declaredCovers) {
      expect(
        existsSync(join(PUBLIC_DIR, cover.src)),
        `${slug} declares cover ${cover.src}, which is not in public/`,
      ).toBe(true)
    }
  })

  test('every declared cover matches its file dimensions', () => {
    for (const { slug, cover } of declaredCovers) {
      const measured = imageSize(readFileSync(join(PUBLIC_DIR, cover.src)))

      expect(
        { width: measured.width, height: measured.height },
        `${slug} declares ${cover.width}x${cover.height} for ${cover.src}`,
      ).toEqual({ width: cover.width, height: cover.height })
    }
  })
})

describe('formatPostDate', () => {
  test('formats an ISO date for display', () => {
    expect(formatPostDate('2026-08-01')).toBe('August 1, 2026')
  })
})

describe('PostFrontmatter dates', () => {
  const decodePostFrontmatter = S.decodeUnknownSync(PostFrontmatter)

  const withDate = (date: string) => ({
    title: 'Title',
    description: 'Description',
    date,
  })

  test.each(['2026-08-01', '2026-02-28', '2024-02-29', '2026-12-31'])(
    'accepts the calendar date %s',
    date => {
      expect(() => decodePostFrontmatter(withDate(date))).not.toThrow()
    },
  )

  test.each([
    '2026-02-30',
    '2025-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-01-32',
    '2026-01-00',
    'August 1, 2026',
  ])('rejects %s', date => {
    expect(() => decodePostFrontmatter(withDate(date))).toThrow()
  })
})

describe('PostFrontmatter covers', () => {
  const decodePostFrontmatter = S.decodeUnknownSync(PostFrontmatter)

  const withoutCover = {
    title: 'Title',
    description: 'Description',
    date: '2026-08-01',
  }

  const coverFields = {
    coverImage: '/blog/some-post/cover.webp',
    coverImageAlt: 'A paper crane mid-fold',
    coverImageWidth: '1600',
    coverImageHeight: '1067',
  }

  test('accepts a post with no cover', () => {
    expect(() => decodePostFrontmatter(withoutCover)).not.toThrow()
  })

  test('accepts the four cover fields declared together', () => {
    expect(() =>
      decodePostFrontmatter({ ...withoutCover, ...coverFields }),
    ).not.toThrow()
  })

  test('accepts an empty coverImageAlt for a decorative cover', () => {
    expect(() =>
      decodePostFrontmatter({
        ...withoutCover,
        ...coverFields,
        coverImageAlt: '',
      }),
    ).not.toThrow()
  })

  test.each([
    'coverImage',
    'coverImageAlt',
    'coverImageWidth',
    'coverImageHeight',
  ])('rejects a cover missing %s', missingField => {
    const partialCover = Object.fromEntries(
      Object.entries(coverFields).filter(([field]) => field !== missingField),
    )

    expect(() =>
      decodePostFrontmatter({ ...withoutCover, ...partialCover }),
    ).toThrow()
  })

  test('rejects a coverImage that is not root-relative', () => {
    expect(() =>
      decodePostFrontmatter({
        ...withoutCover,
        ...coverFields,
        coverImage: 'blog/some-post/cover.webp',
      }),
    ).toThrow()
  })

  test.each(['0', '-100', '1600.5', '16 00', 'wide'])(
    'rejects the dimension %s',
    dimension => {
      expect(() =>
        decodePostFrontmatter({
          ...withoutCover,
          ...coverFields,
          coverImageWidth: dimension,
        }),
      ).toThrow()
    },
  )
})

describe('maybePostCover', () => {
  const decodePostFrontmatter = S.decodeUnknownSync(PostFrontmatter)

  test('returns the cover a post declares', () => {
    const frontmatter = decodePostFrontmatter({
      title: 'Title',
      description: 'Description',
      date: '2026-08-01',
      coverImage: '/blog/some-post/cover.webp',
      coverImageAlt: 'A paper crane mid-fold',
      coverImageWidth: '1600',
      coverImageHeight: '1067',
    })

    expect(Option.getOrThrow(maybePostCover(frontmatter))).toEqual({
      src: '/blog/some-post/cover.webp',
      alt: 'A paper crane mid-fold',
      width: 1600,
      height: 1067,
    })
  })

  test('returns none for a post without a cover', () => {
    const frontmatter = decodePostFrontmatter({
      title: 'Title',
      description: 'Description',
      date: '2026-08-01',
    })

    expect(Option.isNone(maybePostCover(frontmatter))).toBe(true)
  })
})
