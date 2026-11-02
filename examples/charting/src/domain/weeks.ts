import { Array, DateTime, Option, pipe } from 'effect'

// CONSTANT

export const LAST_YEAR_WEEKS = 52

// WEEKS

export type WeeklyCount = Readonly<{ weekStart: string; count: number }>

export const weekStartForDateTime = (dateTime: DateTime.Utc): string =>
  pipe(
    dateTime,
    DateTime.startOf('week', { weekStartsOn: 1 }),
    DateTime.formatIsoDateUtc,
  )

export const weekStartsForLastYear = (
  now: DateTime.Utc,
): ReadonlyArray<string> => {
  const currentWeekStart = DateTime.startOf(now, 'week', { weekStartsOn: 1 })

  return Array.makeBy(LAST_YEAR_WEEKS, weekIndex =>
    pipe(
      currentWeekStart,
      DateTime.subtract({ weeks: LAST_YEAR_WEEKS - weekIndex - 1 }),
      DateTime.formatIsoDateUtc,
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
