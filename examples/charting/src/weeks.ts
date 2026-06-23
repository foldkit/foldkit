import { Array, Option } from 'effect'

// CONSTANT

const DAYS_PER_WEEK = 7
const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1_000
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND
const MILLISECONDS_PER_WEEK = DAYS_PER_WEEK * MILLISECONDS_PER_DAY
const ISO_DATE_LENGTH = 10

const LAST_YEAR_WEEKS = 52

// WEEKS

export type WeeklyCount = Readonly<{ weekStart: string; count: number }>

export const toIsoDate = (milliseconds: number): string =>
  new Date(milliseconds).toISOString().slice(0, ISO_DATE_LENGTH)

export const dateStringToMilliseconds = (dateString: string): number =>
  new Date(`${dateString}T00:00:00.000Z`).getTime()

export const utcWeekStartMilliseconds = (milliseconds: number): number => {
  const date = new Date(milliseconds)
  const dayOffset = (date.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - dayOffset,
  )
}

export const weekStartForMilliseconds = (milliseconds: number): string =>
  toIsoDate(utcWeekStartMilliseconds(milliseconds))

export const weekStartsForLastYear = (now: number): ReadonlyArray<string> => {
  const currentWeekStart = utcWeekStartMilliseconds(now)
  return Array.makeBy(LAST_YEAR_WEEKS, weekIndex =>
    toIsoDate(
      currentWeekStart -
        (LAST_YEAR_WEEKS - weekIndex - 1) * MILLISECONDS_PER_WEEK,
    ),
  )
}

export const countByWeek = <A>(
  values: ReadonlyArray<A>,
  weekStarts: ReadonlyArray<string>,
  toWeekStart: (value: A) => Option.Option<string>,
): ReadonlyArray<WeeklyCount> =>
  Array.map(weekStarts, weekStart => ({
    weekStart,
    count: Array.length(
      Array.filter(
        values,
        value => Option.getOrElse(toWeekStart(value), () => '') === weekStart,
      ),
    ),
  }))

export const sumByWeek = <A>(
  values: ReadonlyArray<A>,
  weekStarts: ReadonlyArray<string>,
  toWeekStart: (value: A) => string,
  toAmount: (value: A) => number,
): ReadonlyArray<Readonly<{ weekStart: string; amount: number }>> =>
  Array.map(weekStarts, weekStart => ({
    weekStart,
    amount: Array.reduce(
      Array.filter(values, value => toWeekStart(value) === weekStart),
      0,
      (total, value) => total + toAmount(value),
    ),
  }))

export const valueForWeek = (
  values: ReadonlyArray<Readonly<{ weekStart: string; amount: number }>>,
  weekStart: string,
): number =>
  Option.getOrElse(
    Option.map(
      Array.findFirst(values, value => value.weekStart === weekStart),
      ({ amount }) => amount,
    ),
    () => 0,
  )

export const countForWeek = (
  values: ReadonlyArray<WeeklyCount>,
  weekStart: string,
): number =>
  Option.getOrElse(
    Option.map(
      Array.findFirst(values, value => value.weekStart === weekStart),
      ({ count }) => count,
    ),
    () => 0,
  )
