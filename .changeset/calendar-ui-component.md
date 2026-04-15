---
'foldkit': minor
---

Add `Ui.Calendar` component for rendering accessible inline calendar grids.

New `foldkit/ui/calendar` module — a calendar UI primitive that manages the 2D keyboard navigation state machine and renders an ARIA grid. Designed for standalone inline-calendar use (scheduling UIs, event calendars) and as the foundation for the upcoming DatePicker component.

Model:

- Tracks `viewYear`/`viewMonth` (what the grid is showing), `maybeFocusedDate` (keyboard cursor), `maybeSelectedDate` (chosen value), `isGridFocused` (DOM focus state), plus `locale`, `maybeMinDate`, `maybeMaxDate`, `disabledDaysOfWeek`, and `disabledDates` configuration
- Two distinct "current date" concepts: navigating with arrows never touches selection; commit gestures (click, Enter, Space) move both
- `init` takes `today`, optional `maybeInitialSelectedDate`, and configuration; view defaults to the month of the selected date or today

Messages: `ClickedDay`, `PressedKeyOnGrid`, `ClickedPreviousMonthButton`, `ClickedNextMonthButton`, `SelectedMonthFromDropdown`, `SelectedYearFromDropdown`, `FocusedGrid` / `BlurredGrid`, `RefreshedToday`, `CompletedFocusGrid`.

Selection events use the controlled / uncontrolled callback pattern from Listbox / Combobox / Popover: provide an `onSelectedDate?: (date: CalendarDate) => ParentMessage` callback in the ViewConfig to take control of the event, then call `Calendar.selectDate(model, date)` from your handler to write the selection back to internal state. Omit the callback for uncontrolled mode where Calendar manages `maybeSelectedDate` automatically.

OutMessage: `ChangedViewMonth({ year, month })` when navigation changes the visible month — useful for inline-calendar consumers loading month-scoped data like holidays or availability. Date selection does NOT go through OutMessage; subscribe via the `onSelectedDate` callback above.

Keyboard navigation (WAI-ARIA grid pattern):

- Arrow keys move focus by day (±1) or week (±7)
- `Home` / `End` jump to start / end of week (based on `locale.firstDayOfWeek`)
- `PageUp` / `PageDown` move by month
- `Shift+PageUp` / `Shift+PageDown` move by year
- `Enter` / `Space` commits the focused date
- Navigation skips disabled dates with a bounded cap, so fully-disabled ranges don't cause infinite loops

Configuration:

- `maybeMinDate` / `maybeMaxDate` — inclusive range constraints
- `disabledDaysOfWeek` — e.g. `['Saturday', 'Sunday']` to disable weekends
- `disabledDates` — explicit array of disabled dates (holidays, blackout days)
- `locale` — `LocaleConfig` from `foldkit/calendar`, defaults to `defaultEnglishLocale`

View:

- `view` builds ARIA attribute groups (`grid`, `row`, `gridcell`, `columnheader`) plus derived data (6×7 grid of dates, rotated column headers, month/year dropdown options, formatted heading text) and delegates layout to a `toView` callback
- `lazy` memoizes the view for stable renders
- `focusGrid(id)` builds a command that focuses the grid container — intended for parent components like DatePicker that hand off focus after opening

Also extracted named constants for Gregorian cycle arithmetic in `foldkit/calendar/arithmetic.ts` (`MONTHS_PER_YEAR`, `DAYS_PER_YEAR`, `YEARS_PER_ERA`, `DAYS_PER_ERA`, `EPOCH_DAY_OFFSET`). No behavior change, clearer Howard Hinnant algorithm references.
