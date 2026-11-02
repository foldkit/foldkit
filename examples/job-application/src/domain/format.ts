import { Array, Option, pipe } from 'effect'
import { type CalendarDate } from 'foldkit/calendar'

const MONTH_NAMES: ReadonlyArray<string> = [
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
]

const monthName = (date: CalendarDate): string =>
  pipe(
    MONTH_NAMES,
    Array.get(date.month - 1),
    Option.getOrElse(() => String(date.month)),
  )

export const yearMonth = (date: CalendarDate): string =>
  `${monthName(date)} ${date.year}`

export const fullDate = (date: CalendarDate): string =>
  `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`

export const employmentRange = (
  start: CalendarDate,
  isCurrentlyEmployed: boolean,
  maybeEnd: Option.Option<CalendarDate>,
): string => {
  const startText = yearMonth(start)
  if (isCurrentlyEmployed) {
    return `${startText} – Present`
  }
  return Option.match(maybeEnd, {
    onNone: () => startText,
    onSome: end => `${startText} – ${yearMonth(end)}`,
  })
}

export const pluralize = (
  count: number,
  singular: string,
  plural: string,
): string => `${count} ${count === 1 ? singular : plural}`
