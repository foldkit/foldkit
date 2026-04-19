import { Option } from 'effect'
import { type CalendarDate } from 'foldkit/calendar'

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Formats a CalendarDate as `Apr 2026` for human-readable display. */
export const yearMonth = (date: CalendarDate): string =>
  `${MONTH_NAMES[date.month - 1]} ${date.year}`

/** Formats a CalendarDate as `2026-04-16` (zero-padded ISO-style). */
export const fullDate = (date: CalendarDate): string =>
  `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`

/** Formats a work-history date range for display. When the user is
 *  currently employed, shows `start – Present`. When they have an end date,
 *  shows `start – end`. Otherwise shows just `start`. */
export const employmentRange = (
  start: CalendarDate,
  isCurrentlyEmployed: boolean,
  maybeEnd: Option.Option<CalendarDate>,
): string => {
  const startText = yearMonth(start)
  if (isCurrentlyEmployed) {
    return `${startText} \u2013 Present`
  }
  return Option.match(maybeEnd, {
    onNone: () => startText,
    onSome: end => `${startText} \u2013 ${yearMonth(end)}`,
  })
}

/** Singular/plural-aware count string (`0 items`, `1 item`, `2 items`). */
export const pluralize = (
  count: number,
  singular: string,
  plural: string,
): string => `${count} ${count === 1 ? singular : plural}`
