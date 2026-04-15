import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'

import * as Calendar from '../../calendar'
import type { CalendarDate } from '../../calendar'
import * as Command from '../../command'
import { OptionExt } from '../../effectExtensions'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'

// MODEL

/** Schema for the calendar component's state. Tracks the visible month/year,
 * the keyboard-focused and user-selected dates, and the configuration that
 * governs navigation (locale, min/max, disabled days). */
export const Model = S.Struct({
  id: S.String,
  today: Calendar.CalendarDate,
  viewYear: S.Int,
  viewMonth: S.Int.pipe(S.between(1, 12)),
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
/** Sent when the user clicks the previous-month navigation button. */
export const ClickedPreviousMonthButton = m('ClickedPreviousMonthButton')
/** Sent when the user clicks the next-month navigation button. */
export const ClickedNextMonthButton = m('ClickedNextMonthButton')
/** Sent when the user picks a month from the month dropdown. */
export const SelectedMonthFromDropdown = m('SelectedMonthFromDropdown', {
  month: S.Int,
})
/** Sent when the user picks a year from the year dropdown. */
export const SelectedYearFromDropdown = m('SelectedYearFromDropdown', {
  year: S.Int,
})
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
  SelectedMonthFromDropdown,
  SelectedYearFromDropdown,
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
  maybeInitialSelectedDate?: Option.Option<CalendarDate>
  locale?: Calendar.LocaleConfig
  maybeMinDate?: Option.Option<CalendarDate>
  maybeMaxDate?: Option.Option<CalendarDate>
  disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
  disabledDates?: ReadonlyArray<CalendarDate>
}>

/** Creates an initial calendar model. The view month defaults to the month
 * of the initial selected date, or today if no date is pre-selected. */
export const init = (config: InitConfig): Model => {
  const initialFocus = Option.getOrElse(
    config.maybeInitialSelectedDate ?? Option.none<CalendarDate>(),
    () => config.today,
  )
  return {
    id: config.id,
    today: config.today,
    viewYear: initialFocus.year,
    viewMonth: initialFocus.month,
    maybeFocusedDate: Option.some(initialFocus),
    maybeSelectedDate: config.maybeInitialSelectedDate ?? Option.none(),
    isGridFocused: false,
    locale: config.locale ?? Calendar.defaultEnglishLocale,
    maybeMinDate: config.maybeMinDate ?? Option.none(),
    maybeMaxDate: config.maybeMaxDate ?? Option.none(),
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

const DAY_SKIP_CAP = 31
const MONTH_SKIP_CAP = 12

const isDateDisabled = (model: Model, date: CalendarDate): boolean => {
  const belowMin = Option.exists(model.maybeMinDate, min =>
    Calendar.isBefore(date, min),
  )
  if (belowMin) {
    return true
  }
  const aboveMax = Option.exists(model.maybeMaxDate, max =>
    Calendar.isAfter(date, max),
  )
  if (aboveMax) {
    return true
  }
  if (model.disabledDaysOfWeek.includes(Calendar.dayOfWeek(date))) {
    return true
  }
  if (model.disabledDates.some(Calendar.isEqual(date))) {
    return true
  }
  return false
}

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

/** Direction the user moved when jumping to a new view month via dropdown.
 * Used by `skipDisabled` so a forward jump skips forward through disabled
 * dates and a backward jump skips backward. */
const dropdownDirection = (
  model: Model,
  year: number,
  month: number,
): 1 | -1 => {
  const next = Calendar.make(year, month, 1)
  const current = Calendar.make(model.viewYear, model.viewMonth, 1)
  return Calendar.isAfter(next, current) ? 1 : -1
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
        }
        const [nextModel, maybeOutMessage] = commitSelection(model, date)
        return [nextModel, [], maybeOutMessage]
      },

      PressedKeyOnGrid: ({ key, isShift }) => {
        const focused = currentOrFallbackFocus(model)

        if (isCommitKey(key)) {
          if (isDateDisabled(model, focused)) {
            return [model, [], Option.none()]
          }
          const [nextModel, maybeOutMessage] = commitSelection(model, focused)
          return [nextModel, [], maybeOutMessage]
        }

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
      },

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

      SelectedMonthFromDropdown: ({ month }) =>
        applyViewMonthChange(
          model,
          model.viewYear,
          month,
          dropdownDirection(model, model.viewYear, month),
        ),

      SelectedYearFromDropdown: ({ year }) =>
        applyViewMonthChange(
          model,
          year,
          model.viewMonth,
          dropdownDirection(model, year, model.viewMonth),
        ),

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
const cellId = (modelId: string, date: CalendarDate): string =>
  `${modelId}-cell-${date.year}-${date.month}-${date.day}`

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

const YEAR_RANGE_LOOKAHEAD = 10
const YEAR_RANGE_LOOKBEHIND = 100

/** Computes the inclusive year range the year dropdown should expose,
 * derived from min/max constraints if set, else a sensible default window
 * around today. */
const resolveYearRange = (model: Model): readonly [number, number] => {
  const defaultStart = model.today.year - YEAR_RANGE_LOOKBEHIND
  const defaultEnd = model.today.year + YEAR_RANGE_LOOKAHEAD
  const start = Option.match(model.maybeMinDate, {
    onNone: () => defaultStart,
    onSome: min => min.year,
  })
  const end = Option.match(model.maybeMaxDate, {
    onNone: () => defaultEnd,
    onSome: max => max.year,
  })
  return [start, end]
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

/** A column header for the grid's first row (day-of-week labels). */
export type ColumnHeader<ParentMessage> = Readonly<{
  name: string
  attributes: ReadonlyArray<Attribute<ParentMessage>>
}>

/** A single week row in the calendar grid, carrying its own row attributes
 * (role, aria-rowindex) alongside its 7 day cells. */
export type Week<ParentMessage> = Readonly<{
  attributes: ReadonlyArray<Attribute<ParentMessage>>
  cells: ReadonlyArray<DayCell<ParentMessage>>
}>

/** Attribute groups and derived data the calendar component provides to the
 * consumer's `toView` callback. */
export type CalendarAttributes<ParentMessage> = Readonly<{
  root: ReadonlyArray<Attribute<ParentMessage>>
  previousMonthButton: ReadonlyArray<Attribute<ParentMessage>>
  nextMonthButton: ReadonlyArray<Attribute<ParentMessage>>
  heading: Readonly<{ id: string; text: string }>
  monthSelect: ReadonlyArray<Attribute<ParentMessage>>
  monthOptions: ReadonlyArray<Readonly<{ value: number; label: string }>>
  yearSelect: ReadonlyArray<Attribute<ParentMessage>>
  yearOptions: ReadonlyArray<number>
  grid: ReadonlyArray<Attribute<ParentMessage>>
  headerRow: ReadonlyArray<Attribute<ParentMessage>>
  columnHeaders: ReadonlyArray<ColumnHeader<ParentMessage>>
  weeks: ReadonlyArray<Week<ParentMessage>>
}>

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
  monthSelectLabel?: string
  yearSelectLabel?: string
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

/** Renders an accessible calendar grid. Builds ARIA attribute groups (grid,
 * row, gridcell, column header) plus the derived month grid, then delegates
 * layout to the consumer's `toView` callback. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
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
    OnBlur,
    OnChange,
    OnClick,
    OnFocus,
    OnKeyDownPreventDefault,
    Role,
    Tabindex,
    Type,
  } = html<ParentMessage>()

  const { model, toParentMessage, toView, onSelectedDate } = config
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

  /** Returns the parent message to dispatch when the user commits a date. In
   * controlled mode (when `onSelectedDate` is provided), dispatches the
   * callback directly. In uncontrolled mode, routes through the internal
   * `ClickedDay` message so the calendar's own update manages selection. */
  const dispatchSelectedDate = (date: CalendarDate): ParentMessage =>
    onSelectedDate !== undefined
      ? onSelectedDate(date)
      : toParentMessage(ClickedDay({ date }))

  const previousMonthLabel = config.previousMonthLabel ?? 'Previous month'
  const nextMonthLabel = config.nextMonthLabel ?? 'Next month'
  const monthSelectLabel = config.monthSelectLabel ?? 'Select month'
  const yearSelectLabel = config.yearSelectLabel ?? 'Select year'

  const headingText = `${locale.monthNames[viewMonth - 1]} ${viewYear}`

  const monthOptions = locale.monthNames.map((label, index) => ({
    value: index + 1,
    label,
  }))

  const [yearRangeStart, yearRangeEnd] = resolveYearRange(model)
  const yearOptions = Array.makeBy(
    Math.max(0, yearRangeEnd - yearRangeStart + 1),
    index => yearRangeStart + index,
  )

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

  const rootAttributes: ReadonlyArray<Attribute<ParentMessage>> = [Id(id)]

  const previousMonthButtonAttributes: ReadonlyArray<Attribute<ParentMessage>> =
    [
      Type('button'),
      AriaLabel(previousMonthLabel),
      OnClick(toParentMessage(ClickedPreviousMonthButton())),
    ]

  const nextMonthButtonAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Type('button'),
    AriaLabel(nextMonthLabel),
    OnClick(toParentMessage(ClickedNextMonthButton())),
  ]

  const monthSelectAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    AriaLabel(monthSelectLabel),
    OnChange(value =>
      toParentMessage(SelectedMonthFromDropdown({ month: Number(value) })),
    ),
  ]

  const yearSelectAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    AriaLabel(yearSelectLabel),
    OnChange(value =>
      toParentMessage(SelectedYearFromDropdown({ year: Number(value) })),
    ),
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
      Option.map(date => AriaActiveDescendant(cellId(id, date))),
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
      Id(cellId(id, date)),
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

  return toView({
    root: rootAttributes,
    previousMonthButton: previousMonthButtonAttributes,
    nextMonthButton: nextMonthButtonAttributes,
    heading: { id: headingId(id), text: headingText },
    monthSelect: monthSelectAttributes,
    monthOptions,
    yearSelect: yearSelectAttributes,
    yearOptions,
    grid: gridAttributes,
    headerRow: headerRowAttributes,
    columnHeaders,
    weeks,
  })
}

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
