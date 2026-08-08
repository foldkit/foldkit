import { Array, Option, Schema as S, String as String_ } from 'effect'

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

/**
 * Frontmatter schema for blog posts. One schema drives both halves of the
 * pipeline: the markdown Vite plugin validates every post's frontmatter
 * against it at build time (unknown fields, missing fields, and malformed
 * values all fail the build), and the post registry decodes the emitted
 * `frontmatter` export with it at module load. Dates must be real calendar
 * dates in `YYYY-MM-DD` form, leap years included.
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
})

export type PostFrontmatter = typeof PostFrontmatter.Type
