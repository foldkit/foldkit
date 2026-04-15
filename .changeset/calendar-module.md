---
'foldkit': minor
---

Add `Calendar` module for immutable calendar-date math.

New `foldkit/calendar` module — an immutable `CalendarDate` type modeling the same concept as Java's `LocalDate` and TC39's `Temporal.PlainDate`. No time, no timezone; useful for birthdays, deadlines, form date inputs, and event calendars. The module depends only on `effect` and can be extracted as a standalone library in the future.

Construction and interop:

- `make` / `unsafeMake` / `isCalendarDate` type guard
- `fromDateLocal` / `fromDateInZone` / `toDateLocal` for JavaScript `Date`
- `CalendarDateFromIsoString` schema transform for JSON and form serialization

Arithmetic (all binary functions are dual via `Function.dual`, so data-first and pipe-style calls both work):

- `addDays` / `addMonths` / `addYears` with day-clamping on month overflow (Jan 31 + 1 month → Feb 28/29)
- `subtractDays` / `subtractMonths` / `subtractYears`
- `daysUntil` / `daysSince` matching `Temporal.PlainDate.until` / `since`

Comparison and ordering:

- `Order` and `Equivalence` exported as named instances for ecosystem interop
- `isEqual`, `isBefore`, `isAfter`, `isBeforeOrEqual`, `isAfterOrEqual`
- `min`, `max`, `between({ minimum, maximum })`, `clamp({ minimum, maximum })`

Calendar info:

- `dayOfWeek` via Sakamoto's algorithm, returning a `DayOfWeek` tagged literal
- `isLeapYear`, `daysInMonth`, `firstOfMonth`, `lastOfMonth`
- `startOfWeek` / `endOfWeek` with configurable first day of week

Today:

- `today.local` and `today.inZone(timeZone)` — Effect-based accessors backed by `Clock.currentTimeMillis`, so tests can freeze time via `TestClock`. This is the only impurity boundary in the module; every other function is referentially transparent.

Locale and formatting:

- `LocaleConfig` schema and `defaultEnglishLocale` constant
- `formatLong`, `formatShort`, `formatAriaLabel` pure formatters
