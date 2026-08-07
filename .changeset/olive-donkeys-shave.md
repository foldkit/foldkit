---
'foldkit': minor
'@foldkit/ui': minor
---

Drive calendar date formatting from the locale instead of hardcoding English

`Calendar.LocaleConfig` carried translated month and day names, but the formatters built their output with English word order, so a German locale rendered "Januar 15, 2026" rather than "15. Januar 2026". Ordering now lives in the config as data.

`LocaleConfig` gains four `DateFormat` fields: `longFormat`, `shortFormat`, `ariaLabelFormat`, and `monthYearFormat`. A `DateFormat` is an ordered list of `DatePart` values (`MonthName`, `ShortMonthName`, `MonthNumber`, `PaddedMonthNumber`, `DayNumber`, `PaddedDayNumber`, `DayName`, `ShortDayName`, `YearNumber`, `LiteralText`), so day-first and year-first locales render correctly without a code change. `Calendar.format` applies an arbitrary `DateFormat`, and the new `Calendar.formatMonthYear` renders the month-and-year shape used by calendar headings.

This is a breaking change to `LocaleConfig`. A locale built by spreading `defaultEnglishLocale` keeps working; one constructed field by field needs the four new fields.

In `@foldkit/ui`, the Calendar drew column header accessible names from a hardcoded English array, ignoring `locale.dayNames` entirely, and built its heading and month-cell labels by interpolating month name and year in English order. Both now go through the locale. The four remaining English strings the component wraps around dates are overridable through ViewConfig: `toDaysGridLabel`, `toWeekLabel`, `toMonthsGridLabel`, and `toYearsGridLabel`, each defaulting to the previous English text.
