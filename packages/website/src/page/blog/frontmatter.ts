import { Array, Option, Schema as S, String as String_, pipe } from 'effect'

// POST FRONTMATTER

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const MONTH_LENGTHS: ReadonlyArray<number> = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
]

const FEBRUARY = 2
const LEAP_FEBRUARY_LENGTH = 29

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const daysInMonth = (year: number, month: number): number => {
  if (month === FEBRUARY && isLeapYear(year)) {
    return LEAP_FEBRUARY_LENGTH
  }
  return Option.getOrElse(Array.get(MONTH_LENGTHS, month - 1), () => 0)
}

const isCalendarDate = (value: string): boolean =>
  Option.match(String_.match(ISO_DATE_PATTERN)(value), {
    onNone: () => false,
    onSome: ([, year = '', month = '', day = '']) => {
      const monthNumber = Number(month)
      const dayNumber = Number(day)
      return (
        monthNumber >= 1 &&
        monthNumber <= 12 &&
        dayNumber >= 1 &&
        dayNumber <= daysInMonth(Number(year), monthNumber)
      )
    },
  })

const PostCoverImagePath = S.String.check(
  S.makeFilter(
    value => (value.startsWith('/') ? undefined : 'not a root-relative path'),
    {
      identifier: 'PostCoverImagePath',
      description: 'a root-relative image path starting with "/"',
    },
  ),
)

const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/

const PostCoverImageDimension = S.String.check(
  S.makeFilter(
    value =>
      POSITIVE_INTEGER_PATTERN.test(value)
        ? undefined
        : 'not a positive integer',
    {
      identifier: 'PostCoverImageDimension',
      description: 'a positive integer pixel count',
    },
  ),
)

/**
 * Frontmatter schema for blog posts. One schema drives both halves of the
 * pipeline: the markdown Vite plugin validates every post's frontmatter
 * against it at build time (unknown fields, missing fields, and malformed
 * values all fail the build), and the post registry decodes the emitted
 * `frontmatter` export with it at module load. Dates must be real calendar
 * dates in `YYYY-MM-DD` form, leap years included.
 *
 * A post with a cover declares all four `coverImage*` fields together.
 * `coverImage` is a root-relative path to a file under `public/`, by
 * convention `/blog/<slug>/cover.<ext>`. An empty `coverImageAlt` marks the
 * image decorative. `coverImageWidth` and `coverImageHeight` are the file's
 * pixel dimensions, which the views use to reserve layout space before the
 * image loads.
 *
 * Kept dependency-light (Schema only) so `vite.config.ts` and
 * `vitest.config.ts` can import it without pulling in the browser view layer.
 */
export const PostFrontmatter = S.Struct({
  title: S.String.check(S.isNonEmpty()),
  description: S.String.check(S.isNonEmpty()),
  date: S.String.check(
    S.makeFilter(
      value => (isCalendarDate(value) ? undefined : 'invalid calendar date'),
      {
        identifier: 'PostDate',
        description: 'a valid calendar date in YYYY-MM-DD form',
      },
    ),
  ),
  coverImage: S.optional(PostCoverImagePath),
  coverImageAlt: S.optional(S.String),
  coverImageWidth: S.optional(PostCoverImageDimension),
  coverImageHeight: S.optional(PostCoverImageDimension),
}).check(
  S.makeFilter(
    fields => {
      const coverFields = [
        fields.coverImage,
        fields.coverImageAlt,
        fields.coverImageWidth,
        fields.coverImageHeight,
      ]
      const declaredCount = pipe(
        coverFields,
        Array.filter(field => field !== undefined),
        Array.length,
      )
      return declaredCount === 0 || declaredCount === coverFields.length
        ? undefined
        : 'coverImage, coverImageAlt, coverImageWidth, and coverImageHeight must be declared together'
    },
    {
      identifier: 'PostCoverFields',
      description: 'the four coverImage* fields declared together',
    },
  ),
)

export type PostFrontmatter = typeof PostFrontmatter.Type

// POST COVER

/**
 * A post's cover image: the root-relative path it serves from, its alt text
 * (empty for a decorative image), and its pixel dimensions, which reserve
 * layout space before the image loads.
 */
export type PostCover = Readonly<{
  src: string
  alt: string
  width: number
  height: number
}>

/**
 * The cover a post's frontmatter declares, when it declares one. The schema
 * guarantees the four cover fields travel together, so a partial declaration
 * reads as no cover rather than a broken one.
 */
export const maybePostCover = (
  frontmatter: PostFrontmatter,
): Option.Option<PostCover> =>
  Option.all({
    src: Option.fromNullishOr(frontmatter.coverImage),
    alt: Option.fromNullishOr(frontmatter.coverImageAlt),
    width: Option.map(
      Option.fromNullishOr(frontmatter.coverImageWidth),
      Number,
    ),
    height: Option.map(
      Option.fromNullishOr(frontmatter.coverImageHeight),
      Number,
    ),
  })
