import { Effect, Layer, Option, Predicate, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import type { CalendarDate } from 'foldkit/calendar'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import type { AnchorConfig } from '../anchor/index.js'
import * as UiCalendar from '../calendar/index.js'
import { idSelector } from '../internal/selectors.js'
import * as Popover from '../popover/index.js'

// MODEL

/** Schema for the date picker component's private interaction state. The
 * selected date is owned by the parent and passed in via
 * `ViewInputs.maybeSelectedDate`. This holds the embedded Calendar instance
 * (the visible grid) and the embedded Popover instance (the open/close +
 * transition layer). */
export const Model = Schema.Struct({
  id: Schema.String,
  calendar: UiCalendar.Calendar,
  popover: Popover.Popover,
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the date picker component can produce. Send the
 *  `Requested*` and `InformedOf*` Messages from the parent to drive the
 *  DatePicker. */
export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  RequestedSelectDate: { date: Calendar.CalendarDate },
  RequestedClear: {},
  Cleared: {},
  Opened: {},
  Closed: {},
  RequestedFocusDate: { date: Calendar.CalendarDate },
  InformedOfMinDateChange: {
    maybeMinDate: Schema.Option(Calendar.CalendarDate),
  },
  InformedOfMaxDateChange: {
    maybeMaxDate: Schema.Option(Calendar.CalendarDate),
  },
  InformedOfDisabledDatesChange: {
    disabledDates: Schema.Array(Calendar.CalendarDate),
  },
  InformedOfDisabledDaysOfWeekChange: {
    disabledDaysOfWeek: Schema.Array(Calendar.DayOfWeek),
  },
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

// INIT

/** Constructor args for a DatePicker instance. `id` is the base DOM id; the
 *  embedded Calendar and Popover use `${id}-calendar` and `${id}-popover`.
 *  The selected date is owned by the parent; pass its current value as
 *  `initialViewDate` to open the calendar onto that month. */
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

const toCalendarConfig = (config: InitConfig): UiCalendar.InitConfig => ({
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
})

const toPopoverArgs = (config: InitConfig): Popover.PopoverArgs => ({
  id: `${config.id}-popover`,
  contentFocus: true,
  ...(config.isAnimated !== undefined && { isAnimated: config.isAnimated }),
})

// UPDATE

const dropCalendarToDays = (model: Model) =>
  model.calendar.send(UiCalendar.Calendar.Message.RequestedDropToDays())

const openDatePicker = (model: Model) => ({
  model,
  messages: [
    model.popover.send(Popover.Popover.Message.RequestedOpen()),
    dropCalendarToDays(model),
  ],
})

const closeDatePicker = (model: Model) => ({
  model,
  messages: [
    model.popover.send(Popover.Popover.Message.RequestedClose()),
    dropCalendarToDays(model),
  ],
})

const clearDatePicker = (model: Model) => ({
  model,
  outMessage: OutMessage.ClearedDate(),
})

const sendToCalendar = (
  model: Model,
  message: typeof UiCalendar.Calendar.Message.Type,
) => ({ model, messages: [model.calendar.send(message)] })

// SELECTORS

/** Returns the bare DOM id of the date picker trigger button, derived from
 *  the date picker's base id. The trigger is the embedded Popover's button,
 *  so the id is suffixed `-popover-button`. Use this to associate an external
 *  label with the trigger via a native `<label for={DatePicker.triggerId(id)}>`
 *  or an `aria-labelledby` reference. */
export const triggerId = (id: string): string => `${id}-popover-button`

// VIEW

const encodeIsoDate = Schema.encodeSync(Calendar.CalendarDateFromIsoString)

/** The view input a parent passes to `datePicker.view(...)` on each render.
 *
 *  The DatePicker emits a `SelectedDate({ date })` OutMessage when the
 *  user commits a date. Handle it with `datePicker.on({ SelectedDate })` in
 *  the parent's update to lift the date into domain state. Calendar label
 *  fields are forwarded to the embedded Calendar. */
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

// BLOCK

/** An accessible date picker: a trigger button that opens a popover
 *  containing an accessible calendar grid. The parent owns the selected date
 *  and passes it in through the view input. Send `Message.RequestedOpen`,
 *  `Message.RequestedSelectDate`, and the other `Requested*` and
 *  `InformedOf*` Messages to drive it, and handle `SelectedDate`,
 *  `ChangedViewMonth`, and `ClearedDate` with `.on`. */
export class DatePicker extends Block<DatePicker, InitConfig, ViewInputs>()(
  'DatePicker',
  {
    Model,
    Message,
    OutMessage,
  },
) {}

/** Implements {@link DatePicker}. Provides `CalendarLive` and `PopoverLive`
 *  to the instances it creates. The Popover opens in `contentFocus` mode so
 *  focus lands on the calendar grid instead of the panel. */
export const DatePickerLive = DatePicker.make(
  Effect.fn(function* (_instanceId, config) {
    const calendar = yield* new UiCalendar.Calendar(
      'calendar',
      toCalendarConfig(config),
    )
    const popover = yield* new Popover.Popover('popover', toPopoverArgs(config))

    return {
      model: { id: config.id, calendar, popover },

      update: {
        RequestedOpen: openDatePicker,
        RequestedClose: closeDatePicker,
        RequestedClear: clearDatePicker,
        Opened: openDatePicker,
        Closed: closeDatePicker,
        Cleared: clearDatePicker,

        RequestedSelectDate: (model, { date }) =>
          sendToCalendar(
            model,
            UiCalendar.Calendar.Message.RequestedSelectDate({ date }),
          ),

        RequestedFocusDate: (model, { date }) =>
          sendToCalendar(
            model,
            UiCalendar.Calendar.Message.RequestedFocusDate({ date }),
          ),

        InformedOfMinDateChange: (model, { maybeMinDate }) =>
          sendToCalendar(
            model,
            UiCalendar.Calendar.Message.InformedOfMinDateChange({
              maybeMinDate,
            }),
          ),

        InformedOfMaxDateChange: (model, { maybeMaxDate }) =>
          sendToCalendar(
            model,
            UiCalendar.Calendar.Message.InformedOfMaxDateChange({
              maybeMaxDate,
            }),
          ),

        InformedOfDisabledDatesChange: (model, { disabledDates }) =>
          sendToCalendar(
            model,
            UiCalendar.Calendar.Message.InformedOfDisabledDatesChange({
              disabledDates,
            }),
          ),

        InformedOfDisabledDaysOfWeekChange: (model, { disabledDaysOfWeek }) =>
          sendToCalendar(
            model,
            UiCalendar.Calendar.Message.InformedOfDisabledDaysOfWeekChange({
              disabledDaysOfWeek,
            }),
          ),

        ...popover.on({
          Opened: model => ({ model, messages: [dropCalendarToDays(model)] }),
          Closed: model => ({ model, messages: [dropCalendarToDays(model)] }),
        }),

        ...calendar.on({
          ChangedViewMonth: (model, { year, month }) => ({
            model,
            outMessage: OutMessage.ChangedViewMonth({ year, month }),
          }),
          SelectedDate: (model, { date }) => ({
            model,
            outMessage: OutMessage.SelectedDate({ date }),
            messages: [
              model.popover.send(Popover.Popover.Message.RequestedClose()),
            ],
          }),
        }),
      },

      view: (model, h, viewInputs) => {
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

        const calendarVNode = model.calendar.view({
          maybeSelectedDate,
          toView: toCalendarView,
          ...calendarViewLabels,
        })

        const popoverVNode = model.popover.view({
          anchor,
          ...(isDisabled !== undefined && { isDisabled }),
          focusSelector: idSelector(`${model.calendar.model.id}-grid`),
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
        })

        const hiddenInputValue = Option.match(maybeSelectedDate, {
          onNone: () => '',
          onSome: encodeIsoDate,
        })

        const maybeHiddenInput: ReadonlyArray<Html> =
          name !== undefined
            ? [
                h.input([
                  h.Type('hidden'),
                  h.Name(name),
                  h.Value(hiddenInputValue),
                ]),
              ]
            : []

        const wrapperAttributes = [
          ...(className !== undefined ? [h.Class(className)] : []),
          ...attributes,
        ]

        return h.div(wrapperAttributes, [popoverVNode, ...maybeHiddenInput])
      },
    }
  }),
).pipe(
  Layer.provide(Layer.mergeAll(UiCalendar.CalendarLive, Popover.PopoverLive)),
)
