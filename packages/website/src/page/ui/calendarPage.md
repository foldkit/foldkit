# Calendar

## An Inline Calendar You Render {#overview}

Calendar provides the state machine, ARIA wiring, and derived data for an inline calendar. You provide the markup and styling through `toView`. Use it in scheduling interfaces and event calendars, or as the calendar inside a date picker.

The Calendar moves among three grids:

- **Days:** a fixed 6×7 grid with locale-aware weekday headings.
- **Months:** 12 cells for choosing a month, arranged in three columns.
- **Years:** 12 cells for choosing a year, arranged in three columns and paged in 12-year windows.

The heading moves from Days to Months, then from Months to Years. Selecting a year returns to Months for that year. Selecting a month returns to Days for that month.

Calendar owns navigation state, including the visible month, active grid, and keyboard cursor. The parent owns the selected date. This keeps the domain value in the parent Model while Calendar handles the interaction state around it.

## Wire Calendar into a Parent

Initialize the Calendar with `Calendar.init()`, store its Model in your parent Model, and delegate its Messages with [`Update.foldChild`](/core/submodel#fold-child). Render it through `h.submodel` with `Calendar.view`.

Pass the parent-owned selection into `viewInputs.maybeSelectedDate` on every render. When Calendar emits `SelectedDate`, fold that OutMessage into the parent's selected-date field. `Calendar.update` returns `{ model, commands?, outMessage? }`, so the same fold can handle `ChangedViewMonth` when your application needs month-scoped data.

:::Info{label="See it in an app"}
See the complete Calendar integration in the [UI Showcase](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/calendar.ts).
:::

## Try It {#examples}

This Calendar highlights today and lets the parent store a selected date. Click a day, or tab into the grid and navigate with the keyboard. The snippet shows the parent Model, `Update.foldChild`, OutMessage handling, and all three view modes.

::Demo{name="basic"}

::Snippet{name="uiCalendarBasic" label="basic calendar example"}

## Render and Style the Calendar {#styling}

Calendar is headless. Its `toView` callback receives attribute groups for the current mode. Spread those attributes onto your elements, then add your own classes and structure.

State data attributes let styles follow Calendar state without rebuilding that logic in the view:

| Attribute            | Present when                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `data-today`         | The cell represents today, today's month, or today's year.                                                                |
| `data-selected`      | The cell represents the parent-owned selected date in Days mode, `viewMonth` in Months mode, or `viewYear` in Years mode. |
| `data-focused`       | The cell is at the keyboard cursor while the grid has DOM focus.                                                          |
| `data-outside-month` | A Days-mode cell falls outside the visible month.                                                                         |
| `data-disabled`      | A day violates a date constraint, or a month or year falls entirely outside the configured minimum and maximum.           |

For example: `group-data-[selected]:` can style a button from the state attributes on its containing grid cell.

## Keyboard Interaction

The grid container holds DOM focus. `aria-activedescendant` points to the cell at the keyboard cursor, so assistive technology can announce movement without moving focus among the buttons.

In Days mode, navigation clamps to `minDate` and `maxDate` and skips disabled dates. The search is bounded, so a fully disabled range terminates cleanly. Disabled month and year cells cannot be committed.

| Key                             | Behavior                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ArrowLeft` / `ArrowRight`      | Move one day, month, or year, according to the current mode.                                      |
| `ArrowUp` / `ArrowDown`         | Move one row: seven days in Days mode, three months in Months mode, or three years in Years mode. |
| `Home` / `End`                  | In Days mode, move to the start or end of the current week using `locale.firstDayOfWeek`.         |
| `PageUp` / `PageDown`           | Move one month in Days mode, one year in Months mode, or one 12-year window in Years mode.        |
| `Shift` + `PageUp` / `PageDown` | In Days mode, move one year.                                                                      |
| `Enter` / `Space`               | Select the date in Days mode, open the month in Months mode, or open the year in Years mode.      |

## Accessibility

Each mode renders a grid with an accessible name and uses `aria-activedescendant` for its keyboard cursor. The Days grid is labeled with a leading word, such as `Calendar, April 2026`, so VoiceOver does not interpret its row position as a date literal.

Rows use `role="row"`. Weekday headings use `role="columnheader"`. Cells use `role="gridcell"` and expose selection state through `aria-selected`. Day buttons receive full accessible names, such as `Monday, April 13, 2026`, and disabled cells use `aria-disabled="true"`.

## API Reference

### InitConfig {#init-config}

Pass this configuration to `Calendar.init()`:

| Name                 | Type                          | Default                | Description                                                                                                                              |
| -------------------- | ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `string`                      | —                      | Unique ID for this Calendar instance.                                                                                                    |
| `today`              | `CalendarDate`                | —                      | Current date used for highlighting and as the fallback focus target. Resolve it at the application boundary with `Calendar.today.local`. |
| `initialViewDate`    | `CalendarDate`                | `today`                | Date whose month opens first. Pass the initial parent-owned selection to open on that value.                                             |
| `locale`             | `LocaleConfig`                | `defaultEnglishLocale` | Month names, weekday names, and the first day of the week. Import the type and default from `foldkit/calendar`.                          |
| `minDate`            | `CalendarDate`                | —                      | Earliest selectable date. Earlier dates are disabled and skipped during Days-mode keyboard navigation.                                   |
| `maxDate`            | `CalendarDate`                | —                      | Latest selectable date. Later dates are disabled and skipped during Days-mode keyboard navigation.                                       |
| `disabledDaysOfWeek` | `ReadonlyArray<DayOfWeek>`    | `[]`                   | Weekdays to disable across every month. For example: `['Saturday', 'Sunday']`.                                                           |
| `disabledDates`      | `ReadonlyArray<CalendarDate>` | `[]`                   | Individual dates to disable. Precompute the array for more complex rules.                                                                |

### Model

Store the Calendar Model as a field in the parent Model. It contains interaction and constraint state, not the selected date.

| Name                 | Type                            | Description                                            |
| -------------------- | ------------------------------- | ------------------------------------------------------ |
| `id`                 | `string`                        | Calendar instance ID.                                  |
| `today`              | `CalendarDate`                  | Date used for the today marker and fallback focus.     |
| `viewYear`           | `number`                        | Year centered by the Calendar.                         |
| `viewMonth`          | `number`                        | Month centered by the Calendar, from 1 through 12.     |
| `viewMode`           | `'Days' \| 'Months' \| 'Years'` | Grid currently displayed.                              |
| `maybeFocusedDate`   | `Option<CalendarDate>`          | Keyboard cursor used by `aria-activedescendant`.       |
| `isGridFocused`      | `boolean`                       | Whether the grid container has DOM focus.              |
| `locale`             | `LocaleConfig`                  | Month names, weekday names, and first day of the week. |
| `maybeMinDate`       | `Option<CalendarDate>`          | Lower selection bound.                                 |
| `maybeMaxDate`       | `Option<CalendarDate>`          | Upper selection bound.                                 |
| `disabledDaysOfWeek` | `ReadonlyArray<DayOfWeek>`      | Weekdays disabled across every month.                  |
| `disabledDates`      | `ReadonlyArray<CalendarDate>`   | Individually disabled dates.                           |

### ViewInputs {#view-config}

Pass these fields under `viewInputs` when `h.submodel` renders `Calendar.view`. The surrounding `h.submodel` configuration separately receives `slotId`, `model`, `view`, and `toParentMessage`.

| Name                       | Type                                       | Default                    | Description                                                                                                |
| -------------------------- | ------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `maybeSelectedDate`        | `Option<CalendarDate>`                     | —                          | Parent-owned selection used to derive selected-cell state. Pass it on every render.                        |
| `toView`                   | `(attributes: CalendarAttributes) => Html` | —                          | Renders the current grid from the mode-specific attribute bundle. Match on `_tag` with `M.tagsExhaustive`. |
| `previousMonthLabel`       | `string`                                   | `'Previous month'`         | Accessible label for the previous-month button in Days mode.                                               |
| `nextMonthLabel`           | `string`                                   | `'Next month'`             | Accessible label for the next-month button in Days mode.                                                   |
| `previousYearsPageLabel`   | `string`                                   | `'Previous 12 years'`      | Accessible label for the previous-page button in Years mode.                                               |
| `nextYearsPageLabel`       | `string`                                   | `'Next 12 years'`          | Accessible label for the next-page button in Years mode.                                                   |
| `daysHeadingButtonLabel`   | `string`                                   | `'Switch to month picker'` | Accessible label for the heading button in Days mode.                                                      |
| `monthsHeadingButtonLabel` | `string`                                   | `'Switch to year picker'`  | Accessible label for the heading button in Months mode.                                                    |

### CalendarAttributes {#calendar-attributes}

`CalendarAttributes` is a discriminated union. Its `_tag` always matches `model.viewMode`. Every variant contains these fields:

| Name      | Type                            | Description                                                                                |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `_tag`    | `'Days' \| 'Months' \| 'Years'` | Discriminator for exhaustive rendering with `M.tagsExhaustive`.                            |
| `root`    | `ReadonlyArray<ChildAttribute>` | Attributes for the outermost Calendar element, including its ID.                           |
| `grid`    | `ReadonlyArray<ChildAttribute>` | Grid semantics, keyboard and focus handlers, accessible name, and active-descendant state. |
| `heading` | `{ id: string; text: string }`  | Heading ID and localized text for the current month, year, or 12-year window.              |

The remaining fields depend on the variant.

#### Days

| Name                                     | Type                            | Description                                                              |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `previousMonthButton`, `nextMonthButton` | `ReadonlyArray<ChildAttribute>` | Attributes for the month-navigation buttons.                             |
| `headingButton`                          | `ReadonlyArray<ChildAttribute>` | Attributes for the heading button that opens Months mode.                |
| `headerRow`                              | `ReadonlyArray<ChildAttribute>` | Attributes for the weekday-header row.                                   |
| `columnHeaders`                          | `ReadonlyArray<ColumnHeader>`   | Seven locale-ordered weekday headings. Each has `name` and `attributes`. |
| `weeks`                                  | `ReadonlyArray<Week>`           | Six rows. Each has `attributes` and seven `DayCell` values.              |

Each `DayCell` contains `date`, `label`, `cellAttributes`, `buttonAttributes`, and the state flags `isSelected`, `isFocused`, `isToday`, `isInViewMonth`, and `isDisabled`.

#### Months

| Name            | Type                            | Description                                                                                                       |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `headingButton` | `ReadonlyArray<ChildAttribute>` | Attributes for the heading button that opens Years mode.                                                          |
| `cells`         | `ReadonlyArray<MonthCell>`      | Twelve month cells with `month`, localized `label` and `shortLabel`, cell and button attributes, and state flags. |

Use `shortLabel` when space is tight. Do not derive an abbreviation by slicing `label`, which is not safe across locales.

#### Years

| Name                                   | Type                            | Description                                                                          |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `previousPageButton`, `nextPageButton` | `ReadonlyArray<ChildAttribute>` | Attributes for paging through 12-year windows.                                       |
| `cells`                                | `ReadonlyArray<YearCell>`       | Twelve year cells with `year`, `label`, cell and button attributes, and state flags. |

Month cells expose `isSelected`, `isFocused`, `isCurrentMonth`, and `isDisabled`. Year cells expose `isSelected`, `isFocused`, `isCurrentYear`, and `isDisabled`.

### OutMessage {#out-message}

Calendar returns an optional OutMessage in the `outMessage` field. Match on its tag in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) configuration.

| Name               | Payload                           | Emitted when                                                                                                                                                                       |
| ------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SelectedDate`     | `{ date: CalendarDate }`          | The user commits a date by click, `Enter`, or `Space`. If the date is outside the visible month, Calendar also moves the view, but emits only `SelectedDate`.                      |
| `ChangedViewMonth` | `{ year: number; month: number }` | Navigation changes the visible month without committing a date. This includes month buttons, cross-month keyboard movement, and choosing a different month or year while drilling. |

Use `SelectedDate` to update the parent-owned selection. Use `ChangedViewMonth` when an inline Calendar needs month-scoped data such as availability, holidays, or events.

### Programmatic Helpers

Call these helpers from parent update handlers when a domain event needs to drive Calendar state.

| Name         | Type                                                                      | Behavior                                                                                                                  |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `selectDate` | `(model: Model, date: CalendarDate) => { model, commands?, outMessage? }` | Moves the view and cursor to the date and emits `SelectedDate`. Fold the OutMessage to update the parent-owned selection. |
| `focusDate`  | `(model: Model, date: CalendarDate) => Model`                             | Moves the view and cursor without selecting. Use it when an external value should determine which month opens.            |
| `FocusGrid`  | `(args: { id: string }) => Command`                                       | Focuses the Calendar grid. A parent such as DatePicker can dispatch it after opening.                                     |
| `dropToDays` | `(model: Model) => Model`                                                 | Returns to Days mode and reconciles the cursor with the visible month.                                                    |

The reflection helpers update constraints already stored in the Calendar Model. They emit no OutMessage and do not reconcile the parent-owned selection. If a new constraint invalidates that value, update the selection explicitly in the same parent handler.

| Name                        | Type                                                   | Behavior                                                             |
| --------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `reflectMinDate`            | `(model: Model, Option<CalendarDate>) => Model`        | Replaces the minimum. Pass `Option.none()` to remove it.             |
| `reflectMaxDate`            | `(model: Model, Option<CalendarDate>) => Model`        | Replaces the maximum. Pass `Option.none()` to remove it.             |
| `reflectDisabledDates`      | `(model: Model, ReadonlyArray<CalendarDate>) => Model` | Replaces the disabled-date list. Pass an empty array to clear it.    |
| `reflectDisabledDaysOfWeek` | `(model: Model, ReadonlyArray<DayOfWeek>) => Model`    | Replaces the disabled-weekday list. Pass an empty array to clear it. |
