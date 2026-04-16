---
'foldkit': minor
---

Simplify Calendar and DatePicker init config — replace Option-wrapped
parameters with plain optional values.

- `maybeInitialSelectedDate: Option<CalendarDate>` → `initialSelectedDate?: CalendarDate`
- `maybeMinDate: Option<CalendarDate>` → `minDate?: CalendarDate`
- `maybeMaxDate: Option<CalendarDate>` → `maxDate?: CalendarDate`

Remove `ChangedSelectedDate` from DatePicker OutMessage. Date selection
now goes through the `onSelectedDate` ViewConfig callback instead.
OutMessage is just `ChangedViewMonth`.
