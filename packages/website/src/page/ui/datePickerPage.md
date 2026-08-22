# Date Picker

## Overview

An accessible date picker that wraps `Calendar` in a `Popover`. Consumers provide the trigger button face and the calendar grid layout. DatePicker handles focus choreography (opening focuses the grid, closing returns focus to the trigger), open/close state, and an optional hidden form input for native form submission.

DatePicker uses the Submodel pattern: initialize with `DatePicker.init()`, store the Model in your parent, wire Messages through [`Update.foldChild`](/core/submodel#fold-child), and render with `DatePicker.view()`. The update function returns `{ model, commands?, outMessage? }`. The [OutMessage](/core/submodel#surfacing-facts) carries `SelectedDate({ date })` when the user commits a date, `ClearedDate` when the user clears it, and `ChangedViewMonth` when navigation shifts the visible month. The parent owns the selected date: store it in your Model, pass it back as `maybeSelectedDate`, and fold `SelectedDate` and `ClearedDate` into that field from the fold's `foldOutMessage`. For programmatic control in update functions, use `DatePicker.open(model)` and `DatePicker.close(model)`, which return `{ model, commands? }` directly.

The calendar heading inside the popover is a button: clicking it switches the day grid into a 3x4 months grid; clicking the year heading from there switches into a paged 3x4 years grid. Selecting a year drills back to the months grid for that year; selecting a month drills back to the days grid for that month. Re-opening the popover always shows the day grid.

:::Info{label="See it in an app"}
Check out how DatePicker is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/datePicker.ts).
:::

## Examples

A date picker constrained to a one-year window around today via `minDate` and `maxDate`. Click the trigger to open, pick a date, click the heading to drill into a months grid (and again to drill into a years grid), or navigate with the full WAI-ARIA grid keyboard pattern. Press Enter to commit, Escape to dismiss.

::Demo{name="basic"}

::Snippet{name="uiDatePickerBasic" label="date picker example"}

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

Give the trigger an accessible name. For a visible label, wire a native `<label for>` that targets the trigger id with `DatePicker.triggerId(id)` rather than hardcoding the `-popover-button` convention. The `for` association makes the trigger properly labeled: assistive technology announces it by the visible label text, and clicking the label opens the date picker. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` for an icon-only trigger with no visible label, or `ariaLabelledBy` when the element that names the trigger is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `DatePicker.init()`. Calendar constraints (min/max, disabled dates) are forwarded to the embedded Calendar submodel.

| Name                 | Type                          | Default                | Description                                                                                                                                                                                      |
| -------------------- | ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | `string`                      | —                      | Unique ID for the date picker instance.                                                                                                                                                          |
| `today`              | `CalendarDate`                | —                      | The current calendar date. Typically fetched at the app boundary via Calendar.today.local and threaded through flags.                                                                            |
| `initialViewDate`    | `CalendarDate`                | —                      | Seeds the month the calendar opens onto. When set, the view starts on the month containing this date. The parent owns the selection itself; pass its current value here to open onto that month. |
| `isAnimated`         | `boolean`                     | `false`                | Enables animation coordination on the popover panel (enter/leave animations).                                                                                                                    |
| `locale`             | `LocaleConfig`                | `defaultEnglishLocale` | Month and day names plus the first day of the week. Import from foldkit/calendar.                                                                                                                |
| `minDate`            | `CalendarDate`                | —                      | Earliest selectable date. Dates before minDate are marked disabled and skipped by keyboard navigation.                                                                                           |
| `maxDate`            | `CalendarDate`                | —                      | Latest selectable date. Dates after maxDate are marked disabled and skipped by keyboard navigation.                                                                                              |
| `disabledDaysOfWeek` | `ReadonlyArray<DayOfWeek>`    | `[]`                   | Days of the week to disable (e.g. ["Saturday", "Sunday"] for weekday-only selection).                                                                                                            |
| `disabledDates`      | `ReadonlyArray<CalendarDate>` | `[]`                   | Explicit list of disabled dates (e.g. holidays). Pre-compute for complex rules.                                                                                                                  |

### Model

The DatePicker Model. Stored on your parent Model and threaded through `DatePicker.update()` and `DatePicker.view()`.

| Name       | Type             | Default | Description                                                                                                                                                                                                      |
| ---------- | ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | `string`         | —       | The date picker instance ID.                                                                                                                                                                                     |
| `calendar` | `Calendar.Model` | —       | The embedded Calendar submodel. Forwards navigation, focus, locale, and disabled-cell state. The picker delegates Calendar messages and resets the calendar to Days mode every time the popover opens or closes. |
| `popover`  | `Popover.Model`  | —       | The embedded Popover submodel. Tracks open/close state, animation phase, and focus choreography (opening focuses the calendar grid, closing returns focus to the trigger).                                       |

### ViewConfig {#view-config}

Configuration object passed to `DatePicker.view()`.

| Name                                     | Type                                             | Default | Description                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`                                  | `DatePicker.Model`                               | —       | The date picker state from your parent Model.                                                                                                                                                                                                                                             |
| `maybeSelectedDate`                      | `Option<CalendarDate>`                           | —       | The parent-owned selected date. Passed through to the calendar (selected-day marker), the trigger content, and the hidden form input. The picker does not store the selection itself; fold the SelectedDate and ClearedDate OutMessages into this field and pass it back on every render. |
| `toParentMessage`                        | `(message: DatePicker.Message) => ParentMessage` | —       | Wraps DatePicker Messages in your parent Message type for Submodel delegation.                                                                                                                                                                                                            |
| `anchor`                                 | `AnchorConfig`                                   | —       | Popover positioning config (placement, gap, offset, padding, isPlacementLocked, and portal). Controls where the calendar panel floats relative to the trigger. Portaled to the document body by default; pass portal: false to keep the panel inside its wrapper.                         |
| `triggerContent`                         | `(maybeDate: Option<CalendarDate>) => Html`      | —       | Renders the trigger button face. Receives the current selection so you can show the formatted date or a placeholder.                                                                                                                                                                      |
| `toCalendarView`                         | `(attributes: CalendarAttributes) => Html`       | —       | Renders the calendar grid layout inside the popover panel. Same callback shape as Calendar.view toView. Lay out the attribute groups (for example grid, header, weeks, or cells) however you like.                                                                                        |
| `isDisabled`                             | `boolean`                                        | `false` | Disables the trigger button, preventing the popover from opening.                                                                                                                                                                                                                         |
| `name`                                   | `string`                                         | —       | When provided, renders a hidden `<input>` with this name and the selected date encoded as an ISO string (YYYY-MM-DD) for native form submission.                                                                                                                                          |
| `triggerClassName / triggerAttributes`   | `string / ReadonlyArray<Attribute<Message>>`     | —       | Class name and additional attributes spread onto the trigger button.                                                                                                                                                                                                                      |
| `ariaLabel`                              | `string`                                         | —       | Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                              |
| `ariaLabelledBy`                         | `string`                                         | —       | Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                  |
| `panelClassName / panelAttributes`       | `string / ReadonlyArray<Attribute<Message>>`     | —       | Class name and additional attributes spread onto the popover panel.                                                                                                                                                                                                                       |
| `backdropClassName / backdropAttributes` | `string / ReadonlyArray<Attribute<Message>>`     | —       | Class name and additional attributes spread onto the click-outside backdrop.                                                                                                                                                                                                              |

### CalendarAttributes {#calendar-attributes}

The discriminated union passed to `toCalendarView`. Pattern-match on `_tag` (`'Days' | 'Months' | 'Years'`) with `M.tagsExhaustive` to render each grid. Each variant exposes a different shape: Days carries weeks plus a headingButton; Months carries 12 month cells plus a headingButton; Years carries 12 year cells plus prev/next page buttons. See [the Calendar page's CalendarAttributes section](/ui/calendar) for the full prop table. The type is the same.

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name               | Type                              | Default | Description                                                                                                                                                                                 |
| ------------------ | --------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SelectedDate`     | `{ date: CalendarDate }`          | —       | Emitted when the user commits a date (click / Enter / Space). Fold it in the `foldOutMessage` of your DatePicker fold to lift the date into domain state.                                   |
| `ClearedDate`      | `{}`                              | —       | Emitted when the user clears the selected date (via Cleared or DatePicker.clear). The popover stays open. Fold it into the parent-owned selected-date field by setting it to Option.none(). |
| `ChangedViewMonth` | `{ year: number; month: number }` | —       | Emitted when navigation changes the visible month inside the calendar grid.                                                                                                                 |

### Programmatic Helpers

Helpers you call from your own update handlers to drive the date picker imperatively: for writing back the selection in controlled mode, opening/closing on domain events, or updating constraints when they derive from other Model state.

The four `reflect*` helpers are how you implement cross-field date validation. Constraints are set at init time and updated via these helpers. They do not live on ViewConfig, because the update function needs them for keyboard-navigation disabled-skipping and commit-time validation. For an end date that must be on or after a start date, call `reflectMinDate(endDatePicker, maybeStartDate)` in the handler that processes the start date change, where `endDatePicker` is the end date picker's own `DatePicker.Model` and `maybeStartDate` is the parent-owned start-date field.

| Name                        | Type                                                                      | Default | Description                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selectDate`                | `(model: Model, date: CalendarDate) => { model, commands?, outMessage? }` | —       | Commits the given date and closes the popover, emitting SelectedDate. Use for a programmatic selection equivalent to a user pick. To move the embedded calendar onto a date without selecting it (opening onto an externally-sourced value), use focusDate.                                                                                 |
| `focusDate`                 | `(model: Model, date: CalendarDate) => Model`                             | —       | Moves the embedded calendar view and cursor to a date without changing the selection (which the parent owns). Use it to navigate the picker onto a known date, for example after the parent sets its value externally (a URL, a saved draft) so opening the picker shows that month. Returns the model directly: no Command, no OutMessage. |
| `clear`                     | `(model: Model) => { model, commands?, outMessage? }`                     | —       | Clears the selected date, emitting ClearedDate so the parent resets its own field. Does not close the popover.                                                                                                                                                                                                                              |
| `open`                      | `(model: Model) => { model, commands? }`                                  | —       | Programmatically opens the popover. Use from domain-event handlers when the date picker should open in response to something other than a trigger click.                                                                                                                                                                                    |
| `close`                     | `(model: Model) => { model, commands? }`                                  | —       | Programmatically closes the popover.                                                                                                                                                                                                                                                                                                        |
| `reflectMinDate`            | `(model: Model, maybeMinDate: Option<CalendarDate>) => Model`             | —       | Updates the minimum selectable date. Pass Option.none() to remove the minimum. Use for cross-field validation, e.g. an end date picker whose minimum tracks a start date picker's selection. Does not reconcile the current selection if it falls below the new minimum.                                                                    |
| `reflectMaxDate`            | `(model: Model, maybeMaxDate: Option<CalendarDate>) => Model`             | —       | Updates the maximum selectable date. Pass Option.none() to remove the maximum. Does not reconcile the current selection.                                                                                                                                                                                                                    |
| `reflectDisabledDates`      | `(model: Model, disabledDates: ReadonlyArray<CalendarDate>) => Model`     | —       | Replaces the list of individually-disabled dates (e.g. holidays). Pass an empty array to clear.                                                                                                                                                                                                                                             |
| `reflectDisabledDaysOfWeek` | `(model: Model, disabledDaysOfWeek: ReadonlyArray<DayOfWeek>) => Model`   | —       | Replaces the list of disabled days of the week (e.g. ["Saturday", "Sunday"]). Pass an empty array to clear.                                                                                                                                                                                                                                 |
