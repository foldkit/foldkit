import { Function, Layer, Option, Predicate, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Calendar from 'foldkit/calendar'
import type { CalendarDate } from 'foldkit/calendar'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import type { AnchorConfig } from '../anchor/index.js'
import * as UiCalendar from '../calendar/index.js'
import { idSelector } from '../internal/selectors.js'
import * as Popover from '../popover/index.js'

// MODEL

/** Schema for the date picker component's private interaction state. The
 * selected date is owned by the parent and passed in via
 * `ViewInputs.maybeSelectedDate`. This holds the embedded Calendar block
 * (the visible grid) and the embedded Popover block (the open/close +
 * transition layer). */
export const Model = Schema.Struct({
  id: Schema.String,
  calendar: UiCalendar.Model,
  popover: Popover.Model,
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the date picker component can produce. */
export const Message = defineMessageUnion({
  GotCalendarMessage: { message: UiCalendar.Message },
  GotPopoverMessage: { message: Popover.Message },
  RequestedSelectDate: { date: Calendar.CalendarDate },
  Cleared: {},
  Opened: {},
  Closed: {},
})
export type Message = typeof Message.Type

// OUT MESSAGE

/** Union of out-messages the date picker can produce. */
export const OutMessage = defineMessageUnion({
  ChangedViewMonth: {
    year: Schema.Int,
    month: Schema.Int,
  },
  SelectedDate: { date: Calendar.CalendarDate },
  ClearedDate: {},
})
export type OutMessage = typeof OutMessage.Type

export type ChangedViewMonth = typeof OutMessage.ChangedViewMonth.Type
export type SelectedDate = typeof OutMessage.SelectedDate.Type
export type ClearedDate = typeof OutMessage.ClearedDate.Type

const DatePicker = Block.define('DatePicker', {
  Model,
  Message,
  OutMessage,
})

// INIT

/** Configuration for creating a date picker model with `init`. */
export type InitConfig = Readonly<{
  id: string
  today: CalendarDate
  initialViewDate?: CalendarDate
  isAnimated?: boolean
  locale?: Calendar.LocaleConfig
  minDate?: CalendarDate
  maxDate?: CalendarDate
  disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
  disabledDates?: ReadonlyArray<CalendarDate>
}>

/** Creates an initial date picker model from a config. The selected date is
 * owned by the parent; pass its current value as `initialViewDate` to open the
 * calendar onto that month. The Calendar and Popover Blocks are created
 * with derived ids so their DOM elements stay addressable. The popover is
 * opened in `contentFocus` mode so focus lands on the calendar grid instead of
 * the panel. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  calendar: UiCalendar.init({
    id: `${config.id}-calendar`,
    today: config.today,
    ...(config.initialViewDate !== undefined && {
      initialViewDate: config.initialViewDate,
    }),
    ...(config.locale !== undefined && { locale: config.locale }),
    ...(config.minDate !== undefined && { minDate: config.minDate }),
    ...(config.maxDate !== undefined && { maxDate: config.maxDate }),
    ...(config.disabledDaysOfWeek !== undefined && {
      disabledDaysOfWeek: config.disabledDaysOfWeek,
    }),
    ...(config.disabledDates !== undefined && {
      disabledDates: config.disabledDates,
    }),
  }),
  popover: Popover.init({
    id: `${config.id}-popover`,
    contentFocus: true,
    ...(config.isAnimated !== undefined && { isAnimated: config.isAnimated }),
  }),
})

// UPDATE

const dropCalendarToDays = DatePicker.step(model => ({
  model: modifyFields(model, { calendar: UiCalendar.dropToDays }),
}))

const foldPopoverOutMessage = Popover.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => dropCalendarToDays,
  Closed: () => dropCalendarToDays,
})

const PopoverBinding = DatePicker.bindChild(Popover.block, {
  field: 'popover',
  parentMessage: Message.GotPopoverMessage,
  init: false,
  outMessage: { fold: foldPopoverOutMessage },
})

const foldCalendarOutMessage = UiCalendar.OutMessage.match({
  ChangedViewMonth: () => DatePicker.step(model => ({ model })),
  SelectedDate: () => PopoverBinding.close(),
})

const toDatePickerOutMessage = UiCalendar.OutMessage.match<OutMessage>({
  ChangedViewMonth: ({ year, month }) =>
    OutMessage.ChangedViewMonth({ year, month }),
  SelectedDate: ({ date }) => OutMessage.SelectedDate({ date }),
})

const CalendarBinding = DatePicker.bindChild(UiCalendar.block, {
  field: 'calendar',
  parentMessage: Message.GotCalendarMessage,
  init: false,
  outMessage: {
    forward: toDatePickerOutMessage,
    fold: foldCalendarOutMessage,
  },
})

const DatePickerComposition = DatePicker.makeComposition({
  childBindings: [PopoverBinding, CalendarBinding],
})

/** Mount Definitions rendered by DatePicker's Popover child. */
export const mounts = DatePickerComposition.mounts

/** Processes a DatePicker Message and returns the next Model, optional
 *  Commands, and an optional OutMessage. */
export const update = DatePickerComposition.makeUpdate((model, message) =>
  Message.match(message, {
    Opened: () =>
      Update.combine(model, [PopoverBinding.open(), dropCalendarToDays]),

    Closed: () =>
      Update.combine(model, [PopoverBinding.close(), dropCalendarToDays]),

    RequestedSelectDate: ({ date }) => CalendarBinding.selectDate(date)(model),

    Cleared: () => ({ model, outMessage: OutMessage.ClearedDate() }),
  }),
)

/** Programmatically opens the DatePicker, updating the Model and returning
 *  focus and Popover Commands. Use this in domain-event handlers. */
const open = DatePicker.step(model => update(model, Message.Opened()))

/** Programmatically closes the date picker. Use this in domain-event handlers. */
const close = DatePicker.step(model => update(model, Message.Closed()))

/** Programmatically selects a date, committing it and closing the popover. Emits a `SelectedDate` OutMessage just like a user-initiated selection. */
const selectDate = DatePicker.step((model, date: CalendarDate) =>
  update(model, Message.RequestedSelectDate({ date })),
)

/** Programmatically clears the selected date. */
const clear = DatePicker.step(model => update(model, Message.Cleared()))

/** Moves the embedded calendar's view and cursor to a date without changing
 *  the selection (which the parent owns). Use it to navigate the picker onto a
 *  known date, for example after the parent sets its value externally (a URL
 *  parameter, a saved draft) so opening the picker shows that month. Returns
 *  the Model directly because it produces no Commands and no OutMessage. */
export const focusDate: Block.Reflect<Model, CalendarDate> = Function.dual(
  2,
  (model: Model, date: CalendarDate): Model =>
    modifyFields(model, {
      calendar: () => UiCalendar.focusDate(model.calendar, date),
    }),
)

/** Reflects the minimum selectable date onto the embedded calendar. Pass
 * `Option.none()` to remove the minimum. Use this when the minimum derives
 * from other Model state (e.g. a start date field whose current selection
 * constrains an end date picker).
 *
 * Does NOT reconcile the current selection. If a previously-selected date
 * is now below the new minimum, it remains selected. Callers should `clear`
 * or reassign the selection explicitly if their domain requires it. */
export const reflectMinDate: Block.Reflect<
  Model,
  Option.Option<CalendarDate>
> = Function.dual(
  2,
  (model: Model, maybeMinDate: Option.Option<CalendarDate>): Model =>
    modifyFields(model, {
      calendar: () => UiCalendar.reflectMinDate(model.calendar, maybeMinDate),
    }),
)

/** Reflects the maximum selectable date onto the embedded calendar. Pass
 * `Option.none()` to remove the maximum. Does NOT reconcile the current
 * selection. */
export const reflectMaxDate: Block.Reflect<
  Model,
  Option.Option<CalendarDate>
> = Function.dual(
  2,
  (model: Model, maybeMaxDate: Option.Option<CalendarDate>): Model =>
    modifyFields(model, {
      calendar: () => UiCalendar.reflectMaxDate(model.calendar, maybeMaxDate),
    }),
)

/** Reflects the list of individually-disabled dates onto the embedded
 * calendar. Pass an empty array to clear. Does NOT reconcile the current
 * selection. */
export const reflectDisabledDates: Block.Reflect<
  Model,
  ReadonlyArray<CalendarDate>
> = Function.dual(
  2,
  (model: Model, disabledDates: ReadonlyArray<CalendarDate>): Model =>
    modifyFields(model, {
      calendar: () =>
        UiCalendar.reflectDisabledDates(model.calendar, disabledDates),
    }),
)

/** Reflects the days of the week that are disabled onto the embedded calendar
 * (e.g. weekends). Pass an empty array to clear. Does NOT reconcile the
 * current selection. */
export const reflectDisabledDaysOfWeek: Block.Reflect<
  Model,
  ReadonlyArray<Calendar.DayOfWeek>
> = Function.dual(
  2,
  (
    model: Model,
    disabledDaysOfWeek: ReadonlyArray<Calendar.DayOfWeek>,
  ): Model =>
    modifyFields(model, {
      calendar: () =>
        UiCalendar.reflectDisabledDaysOfWeek(
          model.calendar,
          disabledDaysOfWeek,
        ),
    }),
)

// SELECTORS

/** Returns the bare DOM id of the date picker trigger button, derived from
 *  the date picker's base id. The trigger is the embedded Popover's button,
 *  so the id is suffixed `-popover-button`. Use this to associate an external
 *  label with the trigger via a native `<label for={DatePicker.triggerId(id)}>`
 *  or an `aria-labelledby` reference. */
export const triggerId = (id: string): string => `${id}-popover-button`

// VIEW

const encodeIsoDate = Schema.encodeSync(Calendar.CalendarDateFromIsoString)

/** Per-render view inputs passed to the DatePicker connection's `embedView` method.
 *
 *  The DatePicker emits a `SelectedDate({ date })` OutMessage when the
 *  user commits a date. Handle it in the DatePicker connection's OutMessage
 *  fold to lift the date into domain
 *  state. Calendar label fields are forwarded to the embedded Calendar. */
export type ViewInputs = Readonly<{
  anchor: AnchorConfig
  /** The selected date, read straight from the parent Model. The trigger
   * content, the calendar's selected-day marker, and the hidden form input all
   * derive from it. */
  maybeSelectedDate: Option.Option<CalendarDate>
  /** Renders the trigger button's content (typically the formatted selected
   * date or a placeholder). Receives the current selection. */
  triggerContent: (maybeDate: Option.Option<CalendarDate>) => Html
  /** Renders the calendar grid layout inside the popover panel. The
   * consumer lays out the attribute bundles exactly as they would for
   * an inline calendar. */
  toCalendarView: (attributes: UiCalendar.CalendarAttributes) => Html
  isDisabled?: boolean
  /** Name for the hidden form input. When provided, a hidden `<input>` is
   * rendered alongside the trigger so native form submission captures the
   * selected date as an ISO string (`YYYY-MM-DD`). */
  name?: string
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  triggerClassName?: string
  triggerAttributes?: ReadonlyArray<ChildAttribute>
  ariaLabel?: string
  ariaLabelledBy?: string
  panelClassName?: string
  panelAttributes?: ReadonlyArray<ChildAttribute>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<ChildAttribute>
}> &
  UiCalendar.ViewLabels

/** Renders an accessible date picker: a trigger button that opens a popover
 * containing an accessible calendar grid. The date picker assembles the
 * embedded Calendar and Popover components into one flat API. Consumers
 * provide the trigger face and the calendar grid layout, DatePicker handles
 * focus choreography, open/close state, and form submission. */
export const view = DatePickerComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const {
      anchor,
      maybeSelectedDate,
      triggerContent,
      toCalendarView,
      isDisabled,
      name,
      className,
      attributes = [],
      triggerClassName,
      triggerAttributes = [],
      ariaLabel,
      ariaLabelledBy,
      panelClassName,
      panelAttributes = [],
      backdropClassName,
      backdropAttributes = [],
    } = viewInputs

    const resolveTriggerLabel = () => {
      if (Predicate.isNotUndefined(ariaLabel)) {
        return [h.AriaLabel(ariaLabel)]
      } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
        return [h.AriaLabelledBy(ariaLabelledBy)]
      } else {
        return []
      }
    }

    const triggerLabelAttributes = resolveTriggerLabel()

    const calendarViewLabels: UiCalendar.ViewLabels = {
      ...(viewInputs.previousMonthLabel !== undefined && {
        previousMonthLabel: viewInputs.previousMonthLabel,
      }),
      ...(viewInputs.nextMonthLabel !== undefined && {
        nextMonthLabel: viewInputs.nextMonthLabel,
      }),
      ...(viewInputs.previousYearsPageLabel !== undefined && {
        previousYearsPageLabel: viewInputs.previousYearsPageLabel,
      }),
      ...(viewInputs.nextYearsPageLabel !== undefined && {
        nextYearsPageLabel: viewInputs.nextYearsPageLabel,
      }),
      ...(viewInputs.daysHeadingButtonLabel !== undefined && {
        daysHeadingButtonLabel: viewInputs.daysHeadingButtonLabel,
      }),
      ...(viewInputs.monthsHeadingButtonLabel !== undefined && {
        monthsHeadingButtonLabel: viewInputs.monthsHeadingButtonLabel,
      }),
      ...(viewInputs.toDaysGridLabel !== undefined && {
        toDaysGridLabel: viewInputs.toDaysGridLabel,
      }),
      ...(viewInputs.toWeekLabel !== undefined && {
        toWeekLabel: viewInputs.toWeekLabel,
      }),
      ...(viewInputs.toMonthsGridLabel !== undefined && {
        toMonthsGridLabel: viewInputs.toMonthsGridLabel,
      }),
      ...(viewInputs.toYearsGridLabel !== undefined && {
        toYearsGridLabel: viewInputs.toYearsGridLabel,
      }),
    }

    const calendarVNode = h.block(
      CalendarBinding.embedView({
        slotId: model.calendar.id,
        model: model.calendar,
        viewInputs: {
          maybeSelectedDate,
          toView: toCalendarView,
          ...calendarViewLabels,
        },
      }),
    )

    const popoverVNode = h.block(
      PopoverBinding.embedView({
        slotId: model.popover.id,
        model: model.popover,
        viewInputs: {
          anchor,
          ...(isDisabled !== undefined && { isDisabled }),
          focusSelector: idSelector(`${model.calendar.id}-grid`),
          toView: ({ button, panel, backdrop, isVisible }) =>
            h.div(
              [],
              [
                h.button(
                  [
                    ...button,
                    ...triggerLabelAttributes,
                    ...(triggerClassName !== undefined
                      ? [h.Class(triggerClassName)]
                      : []),
                    ...triggerAttributes,
                  ],
                  [triggerContent(maybeSelectedDate)],
                ),
                ...(isVisible
                  ? [
                      h.div([
                        ...backdrop,
                        ...(backdropClassName !== undefined
                          ? [h.Class(backdropClassName)]
                          : []),
                        ...backdropAttributes,
                      ]),
                      h.div(
                        [
                          ...panel,
                          ...(panelClassName !== undefined
                            ? [h.Class(panelClassName)]
                            : []),
                          ...panelAttributes,
                        ],
                        [calendarVNode],
                      ),
                    ]
                  : []),
              ],
            ),
        },
      }),
    )

    const hiddenInputValue = Option.match(maybeSelectedDate, {
      onNone: () => '',
      onSome: encodeIsoDate,
    })

    const maybeHiddenInput: ReadonlyArray<Html> =
      name !== undefined
        ? [h.input([h.Type('hidden'), h.Name(name), h.Value(hiddenInputValue)])]
        : []

    const wrapperAttributes = [
      ...(className !== undefined ? [h.Class(className)] : []),
      ...attributes,
    ]

    return h.div(wrapperAttributes, [popoverVNode, ...maybeHiddenInput])
  },
)

/** Complete DatePicker Block definition. */
export const block = DatePickerComposition.makeBlock({
  init: DatePickerComposition.makeInit((config: InitConfig) => ({
    model: init(config),
  })),
  update,
  view,
  expose: { open, close, selectDate, clear },
  EffectsLayer: Layer.empty,
})
