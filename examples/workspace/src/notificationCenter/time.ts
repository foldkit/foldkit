import { DateTime, Duration, Option } from 'effect'

const MONTH = Duration.days(30)
const YEAR = Duration.days(365)

export const relativeTime = (createdAt: string, now: number): string =>
  Option.match(DateTime.make(createdAt), {
    onNone: () => 'Recently',
    onSome: createdAt => {
      const elapsed = Duration.millis(
        Math.max(0, now - DateTime.toEpochMillis(createdAt)),
      )

      if (Duration.isLessThan(elapsed, Duration.minutes(1))) {
        return 'Just now'
      } else if (Duration.isLessThan(elapsed, Duration.hours(1))) {
        return `${Math.floor(Duration.toMinutes(elapsed))}m ago`
      } else if (Duration.isLessThan(elapsed, Duration.days(1))) {
        return `${Math.floor(Duration.toHours(elapsed))}h ago`
      } else if (Duration.isLessThan(elapsed, Duration.weeks(1))) {
        return `${Math.floor(Duration.toDays(elapsed))}d ago`
      } else if (Duration.isLessThan(elapsed, MONTH)) {
        return `${Math.floor(Duration.toWeeks(elapsed))}w ago`
      } else if (Duration.isLessThan(elapsed, YEAR)) {
        return `${Math.floor(Duration.toMillis(elapsed) / Duration.toMillis(MONTH))}mo ago`
      } else {
        return `${Math.floor(Duration.toMillis(elapsed) / Duration.toMillis(YEAR))}y ago`
      }
    },
  })

export const absoluteTime = (createdAt: string): string =>
  Option.match(DateTime.make(createdAt), {
    onNone: () => createdAt,
    onSome: date =>
      DateTime.formatLocal(date, {
        locale: 'en',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
  })
