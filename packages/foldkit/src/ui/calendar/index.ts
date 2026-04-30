import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'

import * as Calendar from '../../calendar/index.js'
import type { CalendarDate } from '../../calendar/index.js'
import * as Command from '../../command/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import {
  type Attribute,
  type Html,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import * as Task from '../../task/index.js'

// MODEL

/** Which grid the calendar is currently displaying. `Days` is the standard
 * 6×7 day grid; `Months` is a 3×4 month-name grid for fast month jumps;
 * `Years` is a 3×4 year grid paged in 12-year windows for fast year jumps. */
export const ViewMode = S.Literal('Days', 'Months', 'Years')
export type ViewMode = typeof ViewMode.Type

/** Schema for the calendar component's state. Tracks the visible month/year,
 * the keyboard-focused and user-selected dates, the active view mode, and
 * the configuration that governs navigation (locale, min/max, disabled
 * days). */
export const Model = S.Struct({
  id: S.String,
  today: Calendar.CalendarDate,
  viewYear: S.Int,
  viewMonth: S.Int.pipe(S.between(1, 12)),
  viewMode: ViewMode,
  maybeFocusedDate: S.OptionFromSelf(Calendar.CalendarDate),
  maybeSelectedDate: S.OptionFromSelf(Calendar.CalendarDate),
  isGridFocused: S.Boolean,
  locale: Calendar.LocaleConfig,
  maybeMinDate: S.OptionFromSelf(Calendar.CalendarDate),
  maybeMaxDate: S.OptionFromSelf(Calendar.CalendarDate),
  disabledDaysOfWeek: S.Array(Calendar.DayOfWeek),
  disabledDates: S.Array(Calendar.CalendarDate),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the user clicks a day cell in the grid. */
export const ClickedDay = m('ClickedDay', { date: Calendar.CalendarDate })
/** Sent when the user presses a key on the grid container. The update maps
 * the key to a navigation or selection action. */
export const PressedKeyOnGrid = m('PressedKeyOnGrid', {
  key: S.String,
  isShift: S.Boolean,
})
/** Sent when the user clicks the previous-month navigation button in Days
 * mode. (The Years mode prev/next-page buttons dispatch `PagedYears`.) */
export const ClickedPreviousMonthButton = m('ClickedPreviousMonthButton')
/** Sent when the user clicks the next-month navigation button in Days
 * mode. (The Years mode prev/next-page buttons dispatch `PagedYears`.) */
export const ClickedNextMonthButton = m('ClickedNextMonthButton')
/** Sent when the user clicks the calendar heading. Zooms out one mode
 * level: Days → Months, Months → Years. Terminal in Years mode. */
export const ClickedHeading = m('ClickedHeading')
/** Sent when the user picks a month from the months grid. Jumps the view
 * to that month and returns the calendar to Days mode. */
export const SelectedMonth = m('SelectedMonth', { month: S.Int })
/** Sent when the user picks a year from the years grid. Jumps the view to
 * that year and transitions the calendar to Months mode for further drilling. */
export const SelectedYear = m('SelectedYear', { year: S.Int })
/** Sent when the user pages the years grid forward or backward by one
 * window. Direction is `1` for next, `-1` for previous. */
export const PagedYears = m('PagedYears', { direction: S.Literal(1, -1) })
/** Sent when the grid container receives DOM focus. */
export const FocusedGrid = m('FocusedGrid')
/** Sent when the grid container loses DOM focus. */
export const BlurredGrid = m('BlurredGrid')
/** Sent when a long-lived session's "today" reference should be refreshed. */
export const RefreshedToday = m('RefreshedToday', {
  today: Calendar.CalendarDate,
})
/** Sent when a FocusGrid command completes. */
export const CompletedFocusGrid = m('CompletedFocusGrid')

/** Union of all messages the calendar component can produce. */
export const Message = S.Union(
  ClickedDay,
  PressedKeyOnGrid,
  ClickedPreviousMonthButton,
  ClickedNextMonthButton,
  ClickedHeading,
  SelectedMonth,
  SelectedYear,
  PagedYears,
  FocusedGrid,
  BlurredGrid,
  RefreshedToday,
  CompletedFocusGrid,
)
export type Message = typeof Message.Type

// OUT MESSAGE

/** Emitted when the visible month changes due to navigation. Consumers of an
 * inline calendar may use this to load month-scoped data (holidays, events).
 *
 * Date selection does NOT use OutMessage — consumers subscribe via the
 * `onSelectedDate` callback in `ViewConfig`, matching the Listbox/Popover
 * controlled-component pattern. Use `Calendar.selectDate(model, date)` to
 * write back when handling the callback. */
export const ChangedViewMonth = m('ChangedViewMonth', {
  year: S.Int,
  month: S.Int,
})

/** The calendar's OutMessage. Only one variant — `ChangedViewMonth` — which
 * fires when navigation shifts the visible month. Date selection goes through
 * the `onSelectedDate` ViewConfig callback, not OutMessage. */
export const OutMessage = ChangedViewMonth
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a calendar model with `init`. */
export type InitConfig = Readonly<{
  id: string
  today: CalendarDate
  initialSelectedDate?: CalendarDate
  locale?: Calendar.LocaleConfig
  minDate?: CalendarDate
  maxDate?: CalendarDate
  disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
  disabledDates?: ReadonlyArray<CalendarDate>
}>

/** Creates an initial calendar model. The view month defaults to the month
 * of the initial selected date, or today if no date is pre-selected. */
export const init = (config: InitConfig): Model => {
  const maybeInitialSelectedDate = Option.fromNullable(
    config.initialSelectedDate,
  )
  const initialFocus = Option.getOrElse(
    maybeInitialSelectedDate,
    () => config.today,
  )
  return {
    id: config.id,
    today: config.today,
    viewYear: initialFocus.year,
    viewMonth: initialFocus.month,
    viewMode: 'Days',
    maybeFocusedDate: Option.some(initialFocus),
    maybeSelectedDate: maybeInitialSelectedDate,
    isGridFocused: false,
    locale: config.locale ?? Calendar.defaultEnglishLocale,
    maybeMinDate: Option.fromNullable(config.minDate),
    maybeMaxDate: Option.fromNullable(config.maxDate),
    disabledDaysOfWeek: config.disabledDaysOfWeek ?? [],
    disabledDates: config.disabledDates ?? [],
  }
}

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const gridId = (modelId: string): string => `${modelId}-grid`
const gridSelector = (modelId: string): string => `#${gridId(modelId)}`

/** Focuses the calendar grid container. */
export const FocusGrid = Command.define('FocusGrid', CompletedFocusGrid)

/** Builds a command that focuses the calendar grid container. Parent
 * components like DatePicker dispatch this after opening to hand focus to
 * the grid's keyboard layer. */
export const focusGrid = (modelId: string): Command.Command<Message> =>
  FocusGrid(
    Task.focus(gridSelector(modelId)).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusGrid()),
    ),
  )

/** Programmatically selects a date on the calendar, committing it as the
 * chosen value and moving the cursor onto it. Use this in controlled-mode
 * handlers (when the view's `onSelectedDate` callback is provided) to write
 * the selection back to the calendar's internal state.
 *
 * Equivalent to dispatching `ClickedDay({ date })` through `update`. */
export const selectDate = (model: Model, date: CalendarDate): UpdateReturn =>
  update(model, ClickedDay({ date }))

/** Sets the minimum selectable date. Pass `Option.none()` to remove the
 * minimum. Use this when the minimum derives from other Model state (e.g. a
 * start date field whose current selection constrains an end date picker).
 *
 * Does NOT reconcile the current selection — if a previously-selected date
 * is now below the new minimum, it remains selected. Callers should clear or
 * reassign the selection explicitly if their domain requires it. */
export const setMinDate = (
  model: Model,
  maybeMinDate: Option.Option<CalendarDate>,
): Model => evo(model, { maybeMinDate: () => maybeMinDate })

/** Sets the maximum selectable date. Pass `Option.none()` to remove the
 * maximum. Does NOT reconcile the current selection. */
export const setMaxDate = (
  model: Model,
  maybeMaxDate: Option.Option<CalendarDate>,
): Model => evo(model, { maybeMaxDate: () => maybeMaxDate })

/** Sets the list of individually-disabled dates. Pass an empty array to
 * clear. Does NOT reconcile the current selection. */
export const setDisabledDates = (
  model: Model,
  disabledDates: ReadonlyArray<CalendarDate>,
): Model => evo(model, { disabledDates: () => disabledDates })

/** Sets the days of the week that are disabled (e.g. weekends). Pass an
 * empty array to clear. Does NOT reconcile the current selection. */
export const setDisabledDaysOfWeek = (
  model: Model,
  disabledDaysOfWeek: ReadonlyArray<Calendar.DayOfWeek>,
): Model => evo(model, { disabledDaysOfWeek: () => disabledDaysOfWeek })

/** Returns the calendar to Days mode regardless of current depth. Useful for
 * standalone (non-popovered) consumers that want to wire their own back-out
 * gesture. Popovered consumers like `Ui.DatePicker` don't need this — Escape
 * closes the popover, and the calendar resets to Days on next open.
 *
 * Reconciles `maybeFocusedDate` to a date inside the visible (`viewYear`,
 * `viewMonth`) — Months/Years navigation can leave the cursor on a date
 * outside the days grid (paged-away year, etc.), which would otherwise
 * cause `aria-activedescendant` to point at a non-rendered cell and the
 * next ArrowLeft to jump to the cursor's stale year. */
export const dropToDays = (model: Model): Model => {
  const focusedDay = Option.match(model.maybeFocusedDate, {
    onNone: () => 1,
    onSome: date =>
      Math.min(date.day, Calendar.daysInMonth(model.viewYear, model.viewMonth)),
  })
  return evo(model, {
    viewMode: () => 'Days',
    maybeFocusedDate: () =>
      Option.some(Calendar.make(model.viewYear, model.viewMonth, focusedDay)),
  })
}

const DAY_SKIP_CAP = 31
const MONTH_SKIP_CAP = 12

/** Number of years per Years-mode page. A 3×4 grid renders one window. */
const YEARS_PAGE_SIZE = 12

const isDateDisabled = (model: Model, date: CalendarDate): boolean =>
  Option.exists(model.maybeMinDate, min => Calendar.isBefore(date, min)) ||
  Option.exists(model.maybeMaxDate, max => Calendar.isAfter(date, max)) ||
  model.disabledDaysOfWeek.includes(Calendar.dayOfWeek(date)) ||
  model.disabledDates.some(Calendar.isEqual(date))

/** Walks from `start` in `direction`, returning the first non-disabled date
 * within `cap` steps. Falls back to `start` if every candidate is disabled. */
const skipDisabled = (
  model: Model,
  start: CalendarDate,
  direction: 1 | -1,
  cap: number,
): CalendarDate =>
  pipe(
    cap,
    Array.makeBy(step => Calendar.addDays(start, step * direction)),
    Array.findFirst(date => !isDateDisabled(model, date)),
    Option.getOrElse(() => start),
  )

const clampToRange = (model: Model, candidate: CalendarDate): CalendarDate => {
  const afterMin = Option.match(model.maybeMinDate, {
    onNone: () => candidate,
    onSome: min => Calendar.max(candidate, min),
  })
  return Option.match(model.maybeMaxDate, {
    onNone: () => afterMin,
    onSome: max => Calendar.min(afterMin, max),
  })
}

/** Resolves a navigation key press to the next focused date candidate,
 * along with the direction and search cap for disabled-date skipping. */
const resolveNavigationKey = (
  key: string,
  isShift: boolean,
  focused: CalendarDate,
  firstDayOfWeek: Calendar.DayOfWeek,
): Option.Option<readonly [CalendarDate, 1 | -1, number]> =>
  M.value(key).pipe(
    M.withReturnType<readonly [CalendarDate, 1 | -1, number]>(),
    M.when('ArrowLeft', () => [
      Calendar.addDays(focused, -1),
      -1,
      DAY_SKIP_CAP,
    ]),
    M.when('ArrowRight', () => [Calendar.addDays(focused, 1), 1, DAY_SKIP_CAP]),
    M.when('ArrowUp', () => [Calendar.addDays(focused, -7), -1, DAY_SKIP_CAP]),
    M.when('ArrowDown', () => [Calendar.addDays(focused, 7), 1, DAY_SKIP_CAP]),
    M.when('Home', () => [
      Calendar.startOfWeek(focused, firstDayOfWeek),
      -1,
      DAY_SKIP_CAP,
    ]),
    M.when('End', () => [
      Calendar.endOfWeek(focused, firstDayOfWeek),
      1,
      DAY_SKIP_CAP,
    ]),
    M.when('PageUp', () => [
      isShift
        ? Calendar.addYears(focused, -1)
        : Calendar.addMonths(focused, -1),
      -1,
      MONTH_SKIP_CAP,
    ]),
    M.when('PageDown', () => [
      isShift ? Calendar.addYears(focused, 1) : Calendar.addMonths(focused, 1),
      1,
      MONTH_SKIP_CAP,
    ]),
    M.option,
  )

const isCommitKey = (key: string): boolean => key === 'Enter' || key === ' '

const currentOrFallbackFocus = (model: Model): CalendarDate =>
  Option.getOrElse(model.maybeFocusedDate, () =>
    Calendar.make(model.viewYear, model.viewMonth, 1),
  )

/** Applies a date selection to the model: commits the selection, moves the
 * cursor onto the date, and syncs the view month if the selection crosses a
 * month boundary. Emits `ChangedViewMonth` only when the commit crosses a
 * month boundary. */
const commitSelection = (
  model: Model,
  date: CalendarDate,
): readonly [Model, Option.Option<OutMessage>] => {
  const crossedMonth =
    date.year !== model.viewYear || date.month !== model.viewMonth
  const nextModel = evo(model, {
    maybeSelectedDate: () => Option.some(date),
    maybeFocusedDate: () => Option.some(date),
    viewYear: () => date.year,
    viewMonth: () => date.month,
  })
  const maybeOutMessage = OptionExt.when(
    crossedMonth,
    ChangedViewMonth({ year: date.year, month: date.month }),
  )
  return [nextModel, maybeOutMessage]
}

/** Applies a focus move to the model, clamping to the allowed range and
 * skipping disabled dates. Emits `ChangedViewMonth` if the move crossed a
 * month boundary. */
const applyFocusMove = (
  model: Model,
  candidate: CalendarDate,
  direction: 1 | -1,
  cap: number,
): readonly [Model, Option.Option<OutMessage>] => {
  const clamped = clampToRange(model, candidate)
  const nextFocus = skipDisabled(model, clamped, direction, cap)
  const crossedMonth =
    nextFocus.year !== model.viewYear || nextFocus.month !== model.viewMonth
  const nextModel = evo(model, {
    maybeFocusedDate: () => Option.some(nextFocus),
    viewYear: () => nextFocus.year,
    viewMonth: () => nextFocus.month,
  })
  const maybeOutMessage = OptionExt.when(
    crossedMonth,
    ChangedViewMonth({ year: nextFocus.year, month: nextFocus.month }),
  )
  return [nextModel, maybeOutMessage]
}

/** Computes the focused-date cursor for a view-month change. Preserves the
 * current day-of-month (clamping to the new month's length when needed),
 * then runs the candidate through min/max clamping and disabled-date skipping
 * so the cursor always lands on a real, navigable cell. */
const moveFocusForViewChange = (
  model: Model,
  year: number,
  month: number,
  direction: 1 | -1,
): CalendarDate => {
  const currentDay = Option.match(model.maybeFocusedDate, {
    onNone: () => 1,
    onSome: focused => focused.day,
  })
  const dayInNewMonth = Math.min(currentDay, Calendar.daysInMonth(year, month))
  const candidate = Calendar.make(year, month, dayInNewMonth)
  const clamped = clampToRange(model, candidate)
  return skipDisabled(model, clamped, direction, DAY_SKIP_CAP)
}

const applyViewMonthChange = (
  model: Model,
  year: number,
  month: number,
  direction: 1 | -1,
): UpdateReturn => {
  if (year === model.viewYear && month === model.viewMonth) {
    return [model, [], Option.none()]
  }
  const nextFocus = moveFocusForViewChange(model, year, month, direction)
  const nextModel = evo(model, {
    viewYear: () => year,
    viewMonth: () => month,
    maybeFocusedDate: () => Option.some(nextFocus),
  })
  return [nextModel, [], Option.some(ChangedViewMonth({ year, month }))]
}

/** Direction the user moved when jumping to a new view year/month via grid
 * selection. Used by `skipDisabled` so a forward jump skips forward through
 * disabled dates and a backward jump skips backward. */
const jumpDirection = (model: Model, year: number, month: number): 1 | -1 => {
  const next = Calendar.make(year, month, 1)
  const current = Calendar.make(model.viewYear, model.viewMonth, 1)
  return Calendar.isAfter(next, current) ? 1 : -1
}

/** Maps a keyboard key to a months-grid focus shift (in months). Months
 * mode supports horizontal (±1), vertical (±row width), and PageUp/Down
 * (±12) navigation. */
const resolveMonthsKey = (key: string): Option.Option<number> =>
  M.value(key).pipe(
    M.withReturnType<number>(),
    M.when('ArrowLeft', () => -1),
    M.when('ArrowRight', () => 1),
    M.when('ArrowUp', () => -MONTHS_GRID_COLUMNS),
    M.when('ArrowDown', () => MONTHS_GRID_COLUMNS),
    M.when('PageUp', () => -MONTHS_IN_YEAR),
    M.when('PageDown', () => MONTHS_IN_YEAR),
    M.option,
  )

/** Maps a keyboard key to a years-grid focus shift (in years). Years mode
 * supports horizontal (±1), vertical (±row width), and PageUp/Down (±12 =
 * one window) navigation. */
const resolveYearsKey = (key: string): Option.Option<number> =>
  M.value(key).pipe(
    M.withReturnType<number>(),
    M.when('ArrowLeft', () => -1),
    M.when('ArrowRight', () => 1),
    M.when('ArrowUp', () => -YEARS_GRID_COLUMNS),
    M.when('ArrowDown', () => YEARS_GRID_COLUMNS),
    M.when('PageUp', () => -YEARS_PAGE_SIZE),
    M.when('PageDown', () => YEARS_PAGE_SIZE),
    M.option,
  )

/** Applies a months-grid focus shift, updating `maybeFocusedDate` and
 * `viewYear` to reflect the new focused date. `viewMonth` is preserved —
 * Months mode keyboard navigation moves the cursor without committing. */
const applyMonthsFocusShift = (
  model: Model,
  monthShift: number,
): UpdateReturn => {
  const focused = currentOrFallbackFocus(model)
  const nextFocus = Calendar.addMonths(focused, monthShift)
  return [
    evo(model, {
      maybeFocusedDate: () => Option.some(nextFocus),
      viewYear: () => nextFocus.year,
    }),
    [],
    Option.none(),
  ]
}

/** Applies a years-grid focus shift, updating only `maybeFocusedDate`.
 * `viewYear` is preserved so the "selected" highlight (`year === viewYear`)
 * stays on the calendar's centered year while the cursor moves freely. The
 * visible 12-year page is derived from the cursor in the view layer. */
const applyYearsFocusShift = (
  model: Model,
  yearShift: number,
): UpdateReturn => {
  const focused = currentOrFallbackFocus(model)
  const nextFocus = Calendar.addYears(focused, yearShift)
  return [
    evo(model, {
      maybeFocusedDate: () => Option.some(nextFocus),
    }),
    [],
    Option.none(),
  ]
}

/** Processes a calendar message and returns the next model, commands, and
 * optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedDay: ({ date }) => {
        if (isDateDisabled(model, date)) {
          return [model, [], Option.none()]
        } else {
          const [nextModel, maybeOutMessage] = commitSelection(model, date)
          return [nextModel, [], maybeOutMessage]
        }
      },

      PressedKeyOnGrid: ({ key, isShift }) =>
        M.value(model.viewMode).pipe(
          withUpdateReturn,
          M.when('Days', () => {
            const focused = currentOrFallbackFocus(model)

            if (isCommitKey(key)) {
              if (isDateDisabled(model, focused)) {
                return [model, [], Option.none()]
              } else {
                const [nextModel, maybeOutMessage] = commitSelection(
                  model,
                  focused,
                )
                return [nextModel, [], maybeOutMessage]
              }
            } else {
              return Option.match(
                resolveNavigationKey(
                  key,
                  isShift,
                  focused,
                  model.locale.firstDayOfWeek,
                ),
                {
                  onNone: () => [model, [], Option.none()],
                  onSome: ([candidate, direction, cap]) => {
                    const [nextModel, maybeOutMessage] = applyFocusMove(
                      model,
                      candidate,
                      direction,
                      cap,
                    )
                    return [nextModel, [], maybeOutMessage]
                  },
                },
              )
            }
          }),
          M.when('Months', () =>
            Option.match(resolveMonthsKey(key), {
              onNone: () => [model, [], Option.none()],
              onSome: shift => applyMonthsFocusShift(model, shift),
            }),
          ),
          M.when('Years', () =>
            Option.match(resolveYearsKey(key), {
              onNone: () => [model, [], Option.none()],
              onSome: shift => applyYearsFocusShift(model, shift),
            }),
          ),
          M.exhaustive,
        ),

      ClickedPreviousMonthButton: () => {
        const next = Calendar.subtractMonths(
          Calendar.make(model.viewYear, model.viewMonth, 1),
          1,
        )
        return applyViewMonthChange(model, next.year, next.month, -1)
      },

      ClickedNextMonthButton: () => {
        const next = Calendar.addMonths(
          Calendar.make(model.viewYear, model.viewMonth, 1),
          1,
        )
        return applyViewMonthChange(model, next.year, next.month, 1)
      },

      ClickedHeading: () =>
        M.value(model.viewMode).pipe(
          withUpdateReturn,
          M.when('Days', () => [
            evo(model, { viewMode: () => 'Months' }),
            [focusGrid(model.id)],
            Option.none(),
          ]),
          M.when('Months', () => [
            evo(model, { viewMode: () => 'Years' }),
            [focusGrid(model.id)],
            Option.none(),
          ]),
          M.when('Years', () => [model, [], Option.none()]),
          M.exhaustive,
        ),

      SelectedMonth: ({ month }) => {
        if (isMonthDisabled(model, model.viewYear, month)) {
          return [model, [], Option.none()]
        } else {
          const [nextModel, commands, maybeOutMessage] = applyViewMonthChange(
            model,
            model.viewYear,
            month,
            jumpDirection(model, model.viewYear, month),
          )
          return [
            evo(nextModel, { viewMode: () => 'Days' }),
            [...commands, focusGrid(model.id)],
            maybeOutMessage,
          ]
        }
      },

      SelectedYear: ({ year }) => {
        if (isYearDisabled(model, year)) {
          return [model, [], Option.none()]
        } else {
          const [nextModel, commands, maybeOutMessage] = applyViewMonthChange(
            model,
            year,
            model.viewMonth,
            jumpDirection(model, year, model.viewMonth),
          )
          return [
            evo(nextModel, { viewMode: () => 'Months' }),
            [...commands, focusGrid(model.id)],
            maybeOutMessage,
          ]
        }
      },

      PagedYears: ({ direction }) =>
        applyYearsFocusShift(model, direction * YEARS_PAGE_SIZE),

      FocusedGrid: () => [
        evo(model, { isGridFocused: () => true }),
        [],
        Option.none(),
      ],

      BlurredGrid: () => [
        evo(model, { isGridFocused: () => false }),
        [],
        Option.none(),
      ],

      RefreshedToday: ({ today }) => [
        evo(model, { today: () => today }),
        [],
        Option.none(),
      ],

      CompletedFocusGrid: () => [model, [], Option.none()],
    }),
  )

// VIEW

const headingId = (modelId: string): string => `${modelId}-heading`
const dayCellId = (modelId: string, date: CalendarDate): string =>
  `${modelId}-cell-${date.year}-${date.month}-${date.day}`
const monthCellId = (modelId: string, month: number): string =>
  `${modelId}-cell-month-${month}`
const yearCellId = (modelId: string, year: number): string =>
  `${modelId}-cell-year-${year}`

const DAY_NAMES_SUNDAY_FIRST: ReadonlyArray<Calendar.DayOfWeek> = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const DAY_OF_WEEK_INDEX: Readonly<Record<Calendar.DayOfWeek, number>> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

/** Rotates the Sunday-first day-name array so that `firstDayOfWeek` becomes
 * the first entry. Used to build column headers in locale-appropriate order. */
const rotateDayNames = <A>(
  names: ReadonlyArray<A>,
  firstDayOfWeek: Calendar.DayOfWeek,
): ReadonlyArray<A> => {
  const [front, back] = Array.splitAt(names, DAY_OF_WEEK_INDEX[firstDayOfWeek])
  return [...back, ...front]
}

const WEEKS_IN_GRID = 6
const DAYS_IN_WEEK = 7

/** Builds the 6×7 grid of dates that a calendar view renders for a given
 * month. The grid always has 6 rows to keep height stable across months.
 * Returns the 2D grid alongside the starting date (top-left cell) so
 * callers can derive per-week positions without recomputing. */
const buildGrid = (
  viewYear: number,
  viewMonth: number,
  firstDayOfWeek: Calendar.DayOfWeek,
): Readonly<{
  gridStart: CalendarDate
  weeks: ReadonlyArray<ReadonlyArray<CalendarDate>>
}> => {
  const firstOfMonth = Calendar.make(viewYear, viewMonth, 1)
  const gridStart = Calendar.startOfWeek(firstOfMonth, firstDayOfWeek)
  const weeks = Array.makeBy(WEEKS_IN_GRID, weekIndex =>
    Array.makeBy(DAYS_IN_WEEK, dayIndex =>
      Calendar.addDays(gridStart, weekIndex * DAYS_IN_WEEK + dayIndex),
    ),
  )
  return { gridStart, weeks }
}

/** Information about a single day cell in the rendered calendar grid. */
export type DayCell<ParentMessage> = Readonly<{
  date: CalendarDate
  label: string
  cellAttributes: ReadonlyArray<Attribute<ParentMessage>>
  buttonAttributes: ReadonlyArray<Attribute<ParentMessage>>
  isSelected: boolean
  isFocused: boolean
  isToday: boolean
  isInViewMonth: boolean
  isDisabled: boolean
}>

/** A column header for the day grid's first row (day-of-week labels). */
export type ColumnHeader<ParentMessage> = Readonly<{
  name: string
  attributes: ReadonlyArray<Attribute<ParentMessage>>
}>

/** A single week row in the day grid, carrying its own row attributes (role,
 * aria-rowindex) alongside its 7 day cells. */
export type Week<ParentMessage> = Readonly<{
  attributes: ReadonlyArray<Attribute<ParentMessage>>
  cells: ReadonlyArray<DayCell<ParentMessage>>
}>

/** Information about a single month cell in the rendered months grid.
 * `label` is the locale-aware full month name (e.g. "September"); `shortLabel`
 * is the locale-aware abbreviation (e.g. "Sep"). Render whichever fits the
 * cell — never substring `label` to abbreviate, since that's not safe across
 * locales. */
export type MonthCell<ParentMessage> = Readonly<{
  month: number
  label: string
  shortLabel: string
  cellAttributes: ReadonlyArray<Attribute<ParentMessage>>
  buttonAttributes: ReadonlyArray<Attribute<ParentMessage>>
  isSelected: boolean
  isFocused: boolean
  isCurrentMonth: boolean
  isDisabled: boolean
}>

/** Information about a single year cell in the rendered years grid. */
export type YearCell<ParentMessage> = Readonly<{
  year: number
  label: string
  cellAttributes: ReadonlyArray<Attribute<ParentMessage>>
  buttonAttributes: ReadonlyArray<Attribute<ParentMessage>>
  isSelected: boolean
  isFocused: boolean
  isCurrentYear: boolean
  isDisabled: boolean
}>

/** Attributes provided to the consumer when rendering the day grid. */
export type DaysModeAttributes<ParentMessage> = Readonly<{
  _tag: 'Days'
  root: ReadonlyArray<Attribute<ParentMessage>>
  previousMonthButton: ReadonlyArray<Attribute<ParentMessage>>
  nextMonthButton: ReadonlyArray<Attribute<ParentMessage>>
  headingButton: ReadonlyArray<Attribute<ParentMessage>>
  heading: Readonly<{ id: string; text: string }>
  grid: ReadonlyArray<Attribute<ParentMessage>>
  headerRow: ReadonlyArray<Attribute<ParentMessage>>
  columnHeaders: ReadonlyArray<ColumnHeader<ParentMessage>>
  weeks: ReadonlyArray<Week<ParentMessage>>
}>

/** Attributes provided to the consumer when rendering the months grid. The
 * 12 cells are pre-built in calendar (locale-ordered) — the consumer arranges
 * them in whatever grid layout they prefer (3×4 is the typical choice). */
export type MonthsModeAttributes<ParentMessage> = Readonly<{
  _tag: 'Months'
  root: ReadonlyArray<Attribute<ParentMessage>>
  headingButton: ReadonlyArray<Attribute<ParentMessage>>
  heading: Readonly<{ id: string; text: string }>
  grid: ReadonlyArray<Attribute<ParentMessage>>
  cells: ReadonlyArray<MonthCell<ParentMessage>>
}>

/** Attributes provided to the consumer when rendering the years grid. The
 * 12 cells span one paged window; prev/next buttons page by 12 years. */
export type YearsModeAttributes<ParentMessage> = Readonly<{
  _tag: 'Years'
  root: ReadonlyArray<Attribute<ParentMessage>>
  previousPageButton: ReadonlyArray<Attribute<ParentMessage>>
  nextPageButton: ReadonlyArray<Attribute<ParentMessage>>
  heading: Readonly<{ id: string; text: string }>
  grid: ReadonlyArray<Attribute<ParentMessage>>
  cells: ReadonlyArray<YearCell<ParentMessage>>
}>

/** Discriminated union of attribute groups and derived data the calendar
 * component provides to the consumer's `toView` callback. The variant
 * matches `model.viewMode` — pattern-match on `_tag` with `M.tagsExhaustive`
 * to render each mode. */
export type CalendarAttributes<ParentMessage> =
  | DaysModeAttributes<ParentMessage>
  | MonthsModeAttributes<ParentMessage>
  | YearsModeAttributes<ParentMessage>

/** Configuration for rendering a calendar with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => ParentMessage
  toView: (attributes: CalendarAttributes<ParentMessage>) => Html
  /** Optional callback invoked when the user commits a date via click, Enter,
   * or Space. When provided, the view dispatches the callback directly (the
   * controlled pattern — parent owns the event). When omitted, the calendar
   * manages its own `maybeSelectedDate` state automatically (uncontrolled).
   * In controlled mode, use `Calendar.selectDate(model, date)` to write the
   * selection back to the calendar's internal state. */
  onSelectedDate?: (date: CalendarDate) => ParentMessage
  previousMonthLabel?: string
  nextMonthLabel?: string
  previousYearsPageLabel?: string
  nextYearsPageLabel?: string
  daysHeadingButtonLabel?: string
  monthsHeadingButtonLabel?: string
}>

const NAV_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Enter',
  ' ',
])

const MONTHS_GRID_COLUMNS = 3
const YEARS_GRID_COLUMNS = 3
const MONTHS_IN_YEAR = 12

/** Returns the start year of the 12-year window the years grid renders. */
const yearsPageStart = (viewYear: number): number =>
  Math.floor(viewYear / YEARS_PAGE_SIZE) * YEARS_PAGE_SIZE

/** A month range is fully disabled when its last day is below the minimum
 * or its first day is above the maximum. */
const isMonthDisabled = (
  model: Model,
  year: number,
  month: number,
): boolean => {
  const monthStart = Calendar.make(year, month, 1)
  const monthEnd = Calendar.make(year, month, Calendar.daysInMonth(year, month))
  return (
    Option.exists(model.maybeMinDate, min =>
      Calendar.isBefore(monthEnd, min),
    ) ||
    Option.exists(model.maybeMaxDate, max => Calendar.isAfter(monthStart, max))
  )
}

/** A year is fully disabled when it falls entirely below the minimum date's
 * year or entirely above the maximum date's year. */
const isYearDisabled = (model: Model, year: number): boolean =>
  Option.exists(model.maybeMinDate, min => year < min.year) ||
  Option.exists(model.maybeMaxDate, max => year > max.year)

const buildDaysAttributes = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): DaysModeAttributes<ParentMessage> => {
  const {
    AriaActiveDescendant,
    AriaColcount,
    AriaColindex,
    AriaDisabled,
    AriaLabel,
    AriaRowcount,
    AriaRowindex,
    AriaSelected,
    DataAttribute,
    Id,
    Key,
    OnBlur,
    OnClick,
    OnFocus,
    OnKeyDownPreventDefault,
    Role,
    Tabindex,
    Type,
  } = html<ParentMessage>()

  const { model, toParentMessage, onSelectedDate } = config
  const {
    id,
    viewYear,
    viewMonth,
    maybeFocusedDate,
    maybeSelectedDate,
    today,
    locale,
    isGridFocused,
  } = model

  const dispatchSelectedDate = (date: CalendarDate): ParentMessage =>
    onSelectedDate !== undefined
      ? onSelectedDate(date)
      : toParentMessage(ClickedDay({ date }))

  const previousMonthLabel = config.previousMonthLabel ?? 'Previous month'
  const nextMonthLabel = config.nextMonthLabel ?? 'Next month'
  const headingButtonLabel =
    config.daysHeadingButtonLabel ?? 'Switch to month picker'

  const headingText = `${locale.monthNames[viewMonth - 1]} ${viewYear}`

  const rotatedDayNames = rotateDayNames(
    DAY_NAMES_SUNDAY_FIRST,
    locale.firstDayOfWeek,
  )
  const rotatedShortDayNames = rotateDayNames(
    locale.shortDayNames,
    locale.firstDayOfWeek,
  )

  const { gridStart, weeks: weeksDates } = buildGrid(
    viewYear,
    viewMonth,
    locale.firstDayOfWeek,
  )

  const rootAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Id(id),
    Key('Days'),
  ]

  const previousMonthButton: ReadonlyArray<Attribute<ParentMessage>> = [
    Type('button'),
    AriaLabel(previousMonthLabel),
    OnClick(toParentMessage(ClickedPreviousMonthButton())),
  ]

  const nextMonthButton: ReadonlyArray<Attribute<ParentMessage>> = [
    Type('button'),
    AriaLabel(nextMonthLabel),
    OnClick(toParentMessage(ClickedNextMonthButton())),
  ]

  const headingButton: ReadonlyArray<Attribute<ParentMessage>> = [
    Type('button'),
    AriaLabel(headingButtonLabel),
    OnClick(toParentMessage(ClickedHeading())),
  ]

  const handleKeyDown = (
    key: string,
    modifiers: { readonly shiftKey: boolean },
  ): Option.Option<ParentMessage> => {
    if (!NAV_KEYS.has(key)) {
      return Option.none()
    }
    if (isCommitKey(key) && onSelectedDate !== undefined) {
      return pipe(
        maybeFocusedDate,
        Option.filter(date => !isDateDisabled(model, date)),
        Option.map(onSelectedDate),
      )
    }
    return Option.some(
      toParentMessage(PressedKeyOnGrid({ key, isShift: modifiers.shiftKey })),
    )
  }

  const activeDescendantAttributes: ReadonlyArray<Attribute<ParentMessage>> =
    pipe(
      maybeFocusedDate,
      Option.map(date => AriaActiveDescendant(dayCellId(id, date))),
      Option.toArray,
    )

  const gridAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Id(gridId(id)),
    Role('grid'),
    AriaLabel(`Calendar, ${headingText}`),
    AriaRowcount(WEEKS_IN_GRID + 1),
    AriaColcount(DAYS_IN_WEEK),
    Tabindex(0),
    OnFocus(toParentMessage(FocusedGrid())),
    OnBlur(toParentMessage(BlurredGrid())),
    OnKeyDownPreventDefault(handleKeyDown),
    ...activeDescendantAttributes,
  ]

  const headerRowAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Role('row'),
    AriaRowindex(1),
  ]

  const columnHeaders: ReadonlyArray<ColumnHeader<ParentMessage>> =
    Array.zipWith(rotatedShortDayNames, rotatedDayNames, (name, fullName) => ({
      name,
      fullName,
    })).map(({ name, fullName }, columnIndex) => ({
      name,
      attributes: [
        Role('columnheader'),
        AriaLabel(fullName),
        AriaColindex(columnIndex + 1),
      ],
    }))

  const buildDayCell = (
    date: CalendarDate,
    columnIndex: number,
  ): DayCell<ParentMessage> => {
    const isSelected = Option.exists(maybeSelectedDate, Calendar.isEqual(date))
    const isFocused = Option.exists(maybeFocusedDate, Calendar.isEqual(date))
    const isToday = Calendar.isEqual(today, date)
    const isInViewMonth = date.month === viewMonth && date.year === viewYear
    const isDisabled = isDateDisabled(model, date)

    const stateDataAttributes: ReadonlyArray<Attribute<ParentMessage>> =
      Array.getSomes([
        OptionExt.when(isToday, DataAttribute('today', '')),
        OptionExt.when(isSelected, DataAttribute('selected', '')),
        OptionExt.when(
          isFocused && isGridFocused,
          DataAttribute('focused', ''),
        ),
        OptionExt.when(!isInViewMonth, DataAttribute('outside-month', '')),
        OptionExt.when(isDisabled, DataAttribute('disabled', '')),
      ])

    const cellAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
      Id(dayCellId(id, date)),
      Role('gridcell'),
      AriaSelected(isSelected),
      AriaColindex(columnIndex + 1),
      ...stateDataAttributes,
    ]

    const buttonAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
      Type('button'),
      Tabindex(-1),
      AriaLabel(Calendar.formatAriaLabel(date, locale)),
      AriaDisabled(isDisabled),
      ...(isDisabled ? [] : [OnClick(dispatchSelectedDate(date))]),
    ]

    return {
      date,
      label: String(date.day),
      cellAttributes,
      buttonAttributes,
      isSelected,
      isFocused: isFocused && isGridFocused,
      isToday,
      isInViewMonth,
      isDisabled,
    }
  }

  const weeks: ReadonlyArray<Week<ParentMessage>> = weeksDates.map(
    (weekDates, weekIndex) => {
      const weekStart = Calendar.addDays(gridStart, weekIndex * DAYS_IN_WEEK)
      return {
        attributes: [
          Role('row'),
          AriaRowindex(weekIndex + 2),
          AriaLabel(`Week of ${Calendar.formatLong(weekStart, locale)}`),
        ],
        cells: weekDates.map(buildDayCell),
      }
    },
  )

  return {
    _tag: 'Days',
    root: rootAttributes,
    previousMonthButton,
    nextMonthButton,
    headingButton,
    heading: { id: headingId(id), text: headingText },
    grid: gridAttributes,
    headerRow: headerRowAttributes,
    columnHeaders,
    weeks,
  }
}

const buildMonthsAttributes = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): MonthsModeAttributes<ParentMessage> => {
  const {
    AriaActiveDescendant,
    AriaDisabled,
    AriaLabel,
    AriaSelected,
    DataAttribute,
    Id,
    Key,
    OnBlur,
    OnClick,
    OnFocus,
    OnKeyDownPreventDefault,
    Role,
    Tabindex,
    Type,
  } = html<ParentMessage>()

  const { model, toParentMessage } = config
  const {
    id,
    viewYear,
    viewMonth,
    maybeFocusedDate,
    today,
    locale,
    isGridFocused,
  } = model

  const headingButtonLabel =
    config.monthsHeadingButtonLabel ?? 'Switch to year picker'

  const headingText = `${viewYear}`

  const rootAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Id(id),
    Key('Months'),
  ]

  const headingButton: ReadonlyArray<Attribute<ParentMessage>> = [
    Type('button'),
    AriaLabel(headingButtonLabel),
    OnClick(toParentMessage(ClickedHeading())),
  ]

  const focusedMonth = Option.match(maybeFocusedDate, {
    onNone: () => viewMonth,
    onSome: date => (date.year === viewYear ? date.month : viewMonth),
  })

  const handleKeyDown = (
    key: string,
    modifiers: { readonly shiftKey: boolean },
  ): Option.Option<ParentMessage> => {
    if (!NAV_KEYS.has(key)) {
      return Option.none()
    } else if (isCommitKey(key)) {
      return OptionExt.when(
        !isMonthDisabled(model, viewYear, focusedMonth),
        toParentMessage(SelectedMonth({ month: focusedMonth })),
      )
    } else {
      return Option.some(
        toParentMessage(PressedKeyOnGrid({ key, isShift: modifiers.shiftKey })),
      )
    }
  }

  const activeDescendantAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    AriaActiveDescendant(monthCellId(id, focusedMonth)),
  ]

  const gridAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Id(gridId(id)),
    Role('grid'),
    AriaLabel(`Month picker, ${headingText}`),
    Tabindex(0),
    OnFocus(toParentMessage(FocusedGrid())),
    OnBlur(toParentMessage(BlurredGrid())),
    OnKeyDownPreventDefault(handleKeyDown),
    ...activeDescendantAttributes,
  ]

  const buildMonthCell = (month: number): MonthCell<ParentMessage> => {
    const label = locale.monthNames[month - 1] ?? String(month)
    const shortLabel = locale.shortMonthNames[month - 1] ?? label
    const isSelected = month === viewMonth
    const isFocused = month === focusedMonth
    const isCurrentMonth = today.year === viewYear && today.month === month
    const isDisabled = isMonthDisabled(model, viewYear, month)

    const stateDataAttributes: ReadonlyArray<Attribute<ParentMessage>> =
      Array.getSomes([
        OptionExt.when(isCurrentMonth, DataAttribute('today', '')),
        OptionExt.when(isSelected, DataAttribute('selected', '')),
        OptionExt.when(
          isFocused && isGridFocused,
          DataAttribute('focused', ''),
        ),
        OptionExt.when(isDisabled, DataAttribute('disabled', '')),
      ])

    const cellAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
      Id(monthCellId(id, month)),
      Role('gridcell'),
      AriaSelected(isSelected),
      ...stateDataAttributes,
    ]

    const buttonAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
      Type('button'),
      Tabindex(-1),
      AriaLabel(`${label} ${viewYear}`),
      AriaDisabled(isDisabled),
      ...(isDisabled
        ? []
        : [OnClick(toParentMessage(SelectedMonth({ month })))]),
    ]

    return {
      month,
      label,
      shortLabel,
      cellAttributes,
      buttonAttributes,
      isSelected,
      isFocused: isFocused && isGridFocused,
      isCurrentMonth,
      isDisabled,
    }
  }

  const cells = Array.makeBy(MONTHS_IN_YEAR, monthIndex =>
    buildMonthCell(monthIndex + 1),
  )

  return {
    _tag: 'Months',
    root: rootAttributes,
    headingButton,
    heading: { id: headingId(id), text: headingText },
    grid: gridAttributes,
    cells,
  }
}

const buildYearsAttributes = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): YearsModeAttributes<ParentMessage> => {
  const {
    AriaActiveDescendant,
    AriaDisabled,
    AriaLabel,
    AriaSelected,
    DataAttribute,
    Id,
    Key,
    OnBlur,
    OnClick,
    OnFocus,
    OnKeyDownPreventDefault,
    Role,
    Tabindex,
    Type,
  } = html<ParentMessage>()

  const { model, toParentMessage } = config
  const { id, viewYear, maybeFocusedDate, today, isGridFocused } = model

  const previousYearsPageLabel =
    config.previousYearsPageLabel ?? 'Previous 12 years'
  const nextYearsPageLabel = config.nextYearsPageLabel ?? 'Next 12 years'

  const cursorYear = Option.match(maybeFocusedDate, {
    onNone: () => viewYear,
    onSome: date => date.year,
  })
  const pageStart = yearsPageStart(cursorYear)
  const pageEnd = pageStart + YEARS_PAGE_SIZE - 1
  const headingText = `${pageStart}–${pageEnd}`

  const rootAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Id(id),
    Key('Years'),
  ]

  const previousPageButton: ReadonlyArray<Attribute<ParentMessage>> = [
    Type('button'),
    AriaLabel(previousYearsPageLabel),
    OnClick(toParentMessage(PagedYears({ direction: -1 }))),
  ]

  const nextPageButton: ReadonlyArray<Attribute<ParentMessage>> = [
    Type('button'),
    AriaLabel(nextYearsPageLabel),
    OnClick(toParentMessage(PagedYears({ direction: 1 }))),
  ]

  const focusedYear = cursorYear

  const handleKeyDown = (
    key: string,
    modifiers: { readonly shiftKey: boolean },
  ): Option.Option<ParentMessage> => {
    if (!NAV_KEYS.has(key)) {
      return Option.none()
    } else if (isCommitKey(key)) {
      return OptionExt.when(
        !isYearDisabled(model, focusedYear),
        toParentMessage(SelectedYear({ year: focusedYear })),
      )
    } else {
      return Option.some(
        toParentMessage(PressedKeyOnGrid({ key, isShift: modifiers.shiftKey })),
      )
    }
  }

  const activeDescendantAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    AriaActiveDescendant(yearCellId(id, focusedYear)),
  ]

  const gridAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Id(gridId(id)),
    Role('grid'),
    AriaLabel(`Year picker, ${headingText}`),
    Tabindex(0),
    OnFocus(toParentMessage(FocusedGrid())),
    OnBlur(toParentMessage(BlurredGrid())),
    OnKeyDownPreventDefault(handleKeyDown),
    ...activeDescendantAttributes,
  ]

  const buildYearCell = (year: number): YearCell<ParentMessage> => {
    const label = String(year)
    const isSelected = year === viewYear
    const isFocused = year === focusedYear
    const isCurrentYear = today.year === year
    const isDisabled = isYearDisabled(model, year)

    const stateDataAttributes: ReadonlyArray<Attribute<ParentMessage>> =
      Array.getSomes([
        OptionExt.when(isCurrentYear, DataAttribute('today', '')),
        OptionExt.when(isSelected, DataAttribute('selected', '')),
        OptionExt.when(
          isFocused && isGridFocused,
          DataAttribute('focused', ''),
        ),
        OptionExt.when(isDisabled, DataAttribute('disabled', '')),
      ])

    const cellAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
      Id(yearCellId(id, year)),
      Role('gridcell'),
      AriaSelected(isSelected),
      ...stateDataAttributes,
    ]

    const buttonAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
      Type('button'),
      Tabindex(-1),
      AriaLabel(label),
      AriaDisabled(isDisabled),
      ...(isDisabled ? [] : [OnClick(toParentMessage(SelectedYear({ year })))]),
    ]

    return {
      year,
      label,
      cellAttributes,
      buttonAttributes,
      isSelected,
      isFocused: isFocused && isGridFocused,
      isCurrentYear,
      isDisabled,
    }
  }

  const cells = Array.makeBy(YEARS_PAGE_SIZE, offset =>
    buildYearCell(pageStart + offset),
  )

  return {
    _tag: 'Years',
    root: rootAttributes,
    previousPageButton,
    nextPageButton,
    heading: { id: headingId(id), text: headingText },
    grid: gridAttributes,
    cells,
  }
}

/** Renders an accessible calendar. Builds mode-specific ARIA attribute
 * groups and derived cell data, then delegates layout to the consumer's
 * `toView` callback. The variant of `CalendarAttributes` passed to `toView`
 * matches `model.viewMode`. */
export const view = <ParentMessage>(config: ViewConfig<ParentMessage>): Html =>
  config.toView(
    M.value(config.model.viewMode).pipe(
      M.withReturnType<CalendarAttributes<ParentMessage>>(),
      M.when('Days', () => buildDaysAttributes(config)),
      M.when('Months', () => buildMonthsAttributes(config)),
      M.when('Years', () => buildYearsAttributes(config)),
      M.exhaustive,
    ),
  )

/** Creates a memoized calendar view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <ParentMessage>(
  staticConfig: Omit<ViewConfig<ParentMessage>, 'model' | 'toParentMessage'>,
): ((
  model: Model,
  toParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<ParentMessage>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}
