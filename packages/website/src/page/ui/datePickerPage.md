# Date Picker

## Overview

An accessible date picker that wraps `Calendar` in a `Popover`. Consumers provide the trigger button face and the calendar grid layout. DatePicker handles focus choreography (opening focuses the grid, closing returns focus to the trigger), open/close state, and an optional hidden form input for native form submission.

### State Ownership

Create a `DatePicker.DatePicker` instance in the parent's constructor and hold it in the parent Model. Render it with `model.datePicker.view({ ... })` and provide `DatePicker.DatePickerLive` to the parent's Layer. DatePicker holds its own Calendar and Popover instances, and its Layer provides theirs.

The parent owns the selected date. Store it in the parent Model, pass it to the view as `maybeSelectedDate`, and handle `SelectedDate` and `ClearedDate` with `...datePicker.on({ ... })`. DatePicker can also report `ChangedViewMonth` when navigation changes the visible month.

### Programmatic Control

To open or close the picker from a parent update handler, send the instance `DatePicker.DatePicker.Message.RequestedOpen()` or `RequestedClose()`. Neither reports an OutMessage.

### Calendar Views

The calendar heading inside the popover is a button: clicking it switches the day grid into a 3x4 months grid; clicking the year heading from there switches into a paged 3x4 years grid. Selecting a year drills back to the months grid for that year; selecting a month drills back to the days grid for that month. Re-opening the popover always shows the day grid.

:::Info{label="See it in an app"}
Check out how DatePicker is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/page/datePickerPage.ts).
:::

## Examples

A date picker constrained to a one-year window around today via `minDate` and `maxDate`. Click the trigger to open, pick a date, click the heading to drill into a months grid (and again to drill into a years grid), or navigate with the full WAI-ARIA grid keyboard pattern. Press Enter to commit, Escape to dismiss.

::Demo{name="basic"}

::Snippet{name="uiDatePickerBasic" label="Date picker"}

## Styling

DatePicker is headless. You control the trigger button via `triggerContent` and `triggerClassName`, the popover panel via `panelClassName`, and the calendar grid via the `toCalendarView` callback. Data attributes on day cells let you style state variants with CSS selectors like `group-data-[selected]:` and `group-data-[disabled]:`.

| Attribute            | Condition                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-today`         | Present on the cell representing "today". The day cell in Days mode, the current month cell in Months mode, the current year cell in Years mode.                              |
| `data-selected`      | Present on the calendar's currently-centered cell. The selected date in Days mode, the centered month (viewMonth) in Months mode, the centered year (viewYear) in Years mode. |
| `data-focused`       | Present on the cell at the keyboard cursor position while the grid has DOM focus.                                                                                             |
| `data-outside-month` | (Days mode only.) Present on cells that fall outside the currently-viewed month (leading/trailing grid rows).                                                                 |
| `data-disabled`      | Present on cells disabled by min/max, disabledDaysOfWeek, or disabledDates.                                                                                                   |
| `data-open`          | Present on the trigger button and wrapper while the popover is open.                                                                                                          |
| `data-placement`     | Present on the calendar panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true.            |

## Keyboard Interaction

The trigger button opens the popover on Enter, Space, or ArrowDown. Inside the popover, the calendar grid handles the full WAI-ARIA grid keyboard pattern. Escape closes the popover from both the trigger and the grid.

| Key                                 | Description                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Enter / Space / ArrowDown`         | Open the popover when the trigger button is focused.                                                                                                                                     |
| `Escape`                            | Close the popover from the trigger button or from inside the calendar grid.                                                                                                              |
| `ArrowLeft / ArrowRight`            | Move the focus cursor by one cell. Days: ±1 day. Months: ±1 month (wraps across years). Years: ±1 year (wraps across pages).                                                             |
| `ArrowUp / ArrowDown`               | Move the focus cursor by one row. Days: ±1 week (7 days). Months: ±1 row (3 months). Years: ±1 row (3 years).                                                                            |
| `Home / End`                        | (Days mode only.) Move focus to the start / end of the current week (based on locale.firstDayOfWeek).                                                                                    |
| `PageUp / PageDown`                 | Days: ±1 month. Months: ±1 year. Years: ±1 window (12 years).                                                                                                                            |
| `Shift + PageUp / Shift + PageDown` | (Days mode only.) Move focus by one year.                                                                                                                                                |
| `Enter / Space`                     | Commit the focus cursor. Days: select the date and close the popover. Months: jump the calendar to that month and drill back to Days. Years: jump to that year and drill back to Months. |

## Accessibility

The trigger button uses `aria-expanded` and `aria-controls` to announce the popover relationship. Inside the popover, the calendar grid renders with `role="grid"` and an explicit `aria-label` that leads with a non-numeric word ("Calendar, April 2026") so VoiceOver does not pattern-match the grid's row position into a date literal. `aria-activedescendant` tracks the keyboard cursor; rows carry `role="row"` with `aria-rowindex`; cells carry `role="gridcell"`, `aria-colindex`, and `aria-selected` on the chosen date. Day buttons carry full accessible names via `aria-label` and disabled days get `aria-disabled="true"`. When a hidden form input is enabled via the `name` prop, the selected date is encoded as an ISO string (`YYYY-MM-DD`) for native form submission.

### Naming the Trigger

Give the trigger an accessible name. For a visible label, wire a native `<label for>` that targets the trigger id with `triggerId(id)` imported from `@foldkit/ui/datePicker` rather than hardcoding the `-popover-button` convention. The `for` association makes the trigger properly labeled: assistive technology announces it by the visible label text, and clicking the label opens the date picker. That is why it is the recommended pattern.

Two ViewInputs fields cover the cases a `<label for>` does not. Pass `ariaLabel` for an icon-only trigger with no visible label, or `ariaLabelledBy` when the element that names the trigger is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

The args a parent passes when it creates an instance with `new`. Calendar constraints (min/max, disabled dates) are passed on to the DatePicker's Calendar instance.

| Name                 | Type                          | Default                | Description                                                                                                                                                                                      |
| -------------------- | ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | `string`                      | —                      | Unique ID for the date picker instance.                                                                                                                                                          |
| `today`              | `CalendarDate`                | —                      | The current calendar date. Typically fetched at the app boundary via Calendar.today.local and threaded through flags.                                                                            |
| `initialViewDate`    | `CalendarDate`                | —                      | Seeds the month the calendar opens onto. When set, the view starts on the month containing this date. The parent owns the selection itself; pass its current value here to open onto that month. |
| `isAnimated`         | `boolean`                     | `false`                | Enables animation coordination on the popover panel (enter/leave animations).                                                                                                                    |
| `locale`             | `LocaleConfig`                | `defaultEnglishLocale` | Month and day names, the first day of the week, and the DateFormat for each shape the calendar renders. Import from foldkit/calendar.                                                            |
| `minDate`            | `CalendarDate`                | —                      | Earliest selectable date. Dates before minDate are marked disabled and skipped by keyboard navigation.                                                                                           |
| `maxDate`            | `CalendarDate`                | —                      | Latest selectable date. Dates after maxDate are marked disabled and skipped by keyboard navigation.                                                                                              |
| `disabledDaysOfWeek` | `ReadonlyArray<DayOfWeek>`    | `[]`                   | Days of the week to disable (e.g. ["Saturday", "Sunday"] for weekday-only selection).                                                                                                            |
| `disabledDates`      | `ReadonlyArray<CalendarDate>` | `[]`                   | Explicit list of disabled dates (e.g. holidays). Pre-compute for complex rules.                                                                                                                  |

### Model

The DatePicker instance's Model, read as `model.datePicker.model`. A parent stores the instance itself in its Model as a `DatePicker.DatePicker` field.

| Name       | Type                | Default | Description                                                                                                                                                                                                          |
| ---------- | ------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | `string`            | —       | The date picker instance ID.                                                                                                                                                                                         |
| `calendar` | `Calendar.Calendar` | —       | The DatePicker's Calendar instance. Forwards navigation, focus, locale, and disabled-cell state. The picker delegates Calendar messages and resets the calendar to Days mode every time the popover opens or closes. |
| `popover`  | `Popover.Popover`   | —       | The DatePicker's Popover instance. Tracks open/close state, animation phase, and focus choreography (opening focuses the calendar grid, closing returns focus to the trigger).                                       |

### ViewInputs {#view-config}

Pass these fields to the instance's `view`, as in `model.datePicker.view({ ... })`. Spread the attribute groups the component passes to your callbacks unchanged, and wrap handler-bearing attributes you pass in with `childAttributes`. See [View input](/core/block#callback-dispatch-boundaries).

| Name                                                | Type                                             | Default | Description                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maybeSelectedDate`                                 | `Option<CalendarDate>`                           | —       | The parent-owned selected date. Passed through to the calendar (selected-day marker), the trigger content, and the hidden form input. The picker does not store the selection itself; store what the `SelectedDate` and `ClearedDate` OutMessages report in this field and pass it back on every render. |
| `anchor`                                            | `AnchorConfig`                                   | —       | Popover positioning config (placement, gap, offset, padding, isPlacementLocked, and portal). Controls where the calendar panel floats relative to the trigger. Portaled to the document body, or into an enclosing dialog, by default; pass portal: false to keep the panel inside its wrapper.          |
| `triggerContent`                                    | `(maybeDate: Option<CalendarDate>) => Html`      | —       | Renders the trigger button face. Receives the current selection so you can show the formatted date or a placeholder.                                                                                                                                                                                     |
| `toCalendarView`                                    | `(attributes: CalendarAttributes) => Html`       | —       | Renders the calendar grid layout inside the popover panel. Same callback shape as Calendar.view toView. Lay out the attribute groups (for example grid, header, weeks, or cells) however you like.                                                                                                       |
| `isDisabled`                                        | `boolean`                                        | `false` | Disables the trigger button, preventing the popover from opening.                                                                                                                                                                                                                                        |
| `name`                                              | `string`                                         | —       | When provided, renders a hidden `<input>` with this name and the selected date encoded as an ISO string (YYYY-MM-DD) for native form submission.                                                                                                                                                         |
| `className / attributes`                            | `string / ReadonlyArray<ChildAttribute>`         | —       | Class name and additional attributes spread onto the outer DatePicker wrapper.                                                                                                                                                                                                                           |
| `triggerClassName / triggerAttributes`              | `string / ReadonlyArray<ChildAttribute>`         | —       | Class name and additional attributes spread onto the trigger button.                                                                                                                                                                                                                                     |
| `ariaLabel`                                         | `string`                                         | —       | Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                                             |
| `ariaLabelledBy`                                    | `string`                                         | —       | Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                                 |
| `previousMonthLabel / nextMonthLabel`               | `string / string`                                | English | Accessible labels for the Calendar's previous- and next-month buttons.                                                                                                                                                                                                                                   |
| `previousYearsPageLabel / nextYearsPageLabel`       | `string / string`                                | English | Accessible labels for the Calendar's previous- and next-page buttons in Years mode.                                                                                                                                                                                                                      |
| `daysHeadingButtonLabel / monthsHeadingButtonLabel` | `string / string`                                | English | Accessible labels for switching from Days to Months and from Months to Years.                                                                                                                                                                                                                            |
| `toDaysGridLabel`                                   | `(monthYear: string) => string`                  | English | Builds the Days grid label from the locale-formatted heading.                                                                                                                                                                                                                                            |
| `toWeekLabel`                                       | `(weekStart: CalendarDate) => string`            | English | Builds each week-row label from its first date.                                                                                                                                                                                                                                                          |
| `toMonthsGridLabel`                                 | `(year: number) => string`                       | English | Builds the Months grid label from its displayed year.                                                                                                                                                                                                                                                    |
| `toYearsGridLabel`                                  | `(startYear: number, endYear: number) => string` | English | Builds the Years grid label from the bounds of its displayed window.                                                                                                                                                                                                                                     |
| `panelClassName / panelAttributes`                  | `string / ReadonlyArray<ChildAttribute>`         | —       | Class name and additional attributes spread onto the popover panel.                                                                                                                                                                                                                                      |
| `backdropClassName / backdropAttributes`            | `string / ReadonlyArray<ChildAttribute>`         | —       | Class name and additional attributes spread onto the click-outside backdrop.                                                                                                                                                                                                                             |

### CalendarAttributes {#calendar-attributes}

The discriminated union passed to `toCalendarView`. Pattern-match on `_tag` (`'Days' | 'Months' | 'Years'`) with `Match.tagsExhaustive` to render each grid. Each variant exposes a different shape: Days carries weeks plus a headingButton; Months carries 12 month cells plus a headingButton; Years carries 12 year cells plus prev/next page buttons. See [the Calendar page's CalendarAttributes section](/ui/calendar) for the full prop table. The type is the same.

### OutMessage {#out-message}

Facts the component reports to its parent. Handle them by spreading the instance's `.on({ ... })` into the parent's update record. Variants without a handler are ignored.

| Name               | Type                              | Default | Description                                                                                                                                                                                                                       |
| ------------------ | --------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SelectedDate`     | `{ date: CalendarDate }`          | —       | Emitted when the user commits a date (click / Enter / Space). Handle it with the instance's `.on` to lift the date into domain state.                                                                                             |
| `ClearedDate`      | `{}`                              | —       | Emitted when the user clears the selected date (through the clear control or a `RequestedClear()` Message from the parent). The popover stays open. Handle it by setting the parent-owned selected-date field to `Option.none()`. |
| `ChangedViewMonth` | `{ year: number; month: number }` | —       | Emitted when navigation changes the visible month inside the calendar grid.                                                                                                                                                       |

### Messages a Parent Sends

These Messages let a parent request a controlled selection, focus change, open, or close, and inform the DatePicker when constraints derived from other Model state change. Send them to the instance from a parent update handler, as in `messages: [model.datePicker.send(DatePicker.DatePicker.Message.RequestedClear())]`. Every change to the DatePicker's Model runs through its own update.

The four `InformedOf*Change` Messages implement cross-field date validation. Constraints are set when the instance is created and updated through these Messages. They are not view input, because DatePicker's update needs them for keyboard-navigation disabled-skipping and commit-time validation. For an end date that must be on or after a start date, send `InformedOfMinDateChange({ maybeMinDate: maybeStartDate })` to the end date picker in the parent handler that processes the start date change. DatePicker reports no OutMessage for it.

| Message                                                      | Description                                                                                                                                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RequestedSelectDate({ date })`                              | Requests the given date. A disabled date leaves the DatePicker unchanged and reports nothing; otherwise DatePicker commits it, closes the popover, and reports `SelectedDate`. Use `RequestedFocusDate` to move onto a date without selecting it. |
| `RequestedFocusDate({ date })`                               | Moves the Calendar view and cursor without changing the selection. Use it after the parent sets its value from an external source so opening the picker shows that month. It reports no OutMessage.                                               |
| `RequestedClear()`                                           | Clears the selected date and reports `ClearedDate` so the parent resets its own field. Does not close the popover.                                                                                                                                |
| `RequestedOpen()`                                            | Opens the popover. Use it when the DatePicker should open in response to a parent event rather than a trigger click. It reports no OutMessage.                                                                                                    |
| `RequestedClose()`                                           | Closes the popover. It reports no OutMessage.                                                                                                                                                                                                     |
| `InformedOfMinDateChange({ maybeMinDate })`                  | Replaces the minimum. Pass `Option.none()` to remove it. Use it when an end date picker's minimum tracks a start date. It does not reconcile a current selection below the new minimum.                                                           |
| `InformedOfMaxDateChange({ maybeMaxDate })`                  | Replaces the maximum. Pass `Option.none()` to remove it. It does not reconcile the current selection.                                                                                                                                             |
| `InformedOfDisabledDatesChange({ disabledDates })`           | Replaces the individually disabled dates. Pass an empty array to clear them.                                                                                                                                                                      |
| `InformedOfDisabledDaysOfWeekChange({ disabledDaysOfWeek })` | Replaces the disabled weekdays. Pass an empty array to clear them.                                                                                                                                                                                |
