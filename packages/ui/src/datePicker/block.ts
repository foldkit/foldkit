import { Option, Predicate, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import * as Calendar from 'foldkit/calendar'
import type { CalendarDate } from 'foldkit/calendar'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Update from 'foldkit/update'

import type { AnchorConfig } from '../anchor/index.js'
import * as UiCalendar from '../calendar/index.js'
import { idSelector } from '../internal/selectors.js'
import { Model as PopoverModel } from '../popover/block.js'
import * as Popover from '../popover/index.js'

// MODEL

/** Schema for the date picker component's private interaction state. The
 * selected date is owned by the parent and passed in via
 * `ViewInputs.maybeSelectedDate`. This holds the embedded Calendar block
 * (the visible grid) and the embedded Popover block (the open/close +
 * transition layer). */
export const Model = Schema.Struct({
  id: Schema.String,
  calendar: UiCalendar.CalendarBlock.Model,
  popover: PopoverModel,
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the date picker component can produce. */
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

export type ChangedViewMonth = typeof OutMessage.ChangedViewMonth.Type
export type SelectedDate = typeof OutMessage.SelectedDate.Type
export type ClearedDate = typeof OutMessage.ClearedDate.Type

const DatePickerDefinition = Block.makeDefinition('DatePicker', {
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

const makeInitialModel = (config: InitConfig): Model => ({
  id: config.id,
  calendar: UiCalendar.CalendarBlock.init({
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
  }).model,
  popover: Popover.PopoverBlock.init({
    id: `${config.id}-popover`,
    contentFocus: true,
    ...(config.isAnimated !== undefined && { isAnimated: config.isAnimated }),
  }).model,
})

// UPDATE

const PopoverBinding = DatePickerDefinition.makeBinding(Popover.PopoverBlock, {
  field: 'popover',
  init: false,
})

const CalendarBinding = DatePickerDefinition.makeBinding(
  UiCalendar.CalendarBlock,
  {
    field: 'calendar',
    init: false,
  },
)

const foldPopoverOutMessage = DatePickerDefinition.makeOutMessageFold(
  Popover.PopoverBlock,
  {
    Opened: () => CalendarBinding.requestDropToDays(),
    Closed: () => CalendarBinding.requestDropToDays(),
  },
)

const foldCalendarOutMessage = DatePickerDefinition.makeOutMessageFold(
  UiCalendar.CalendarBlock,
  {
    ChangedViewMonth: DatePickerDefinition.makeNoopStep,
    SelectedDate: () => PopoverBinding.requestClose(),
  },
)

const forwardCalendarOutMessage = DatePickerDefinition.makeOutMessageForward(
  UiCalendar.CalendarBlock,
  {
    ChangedViewMonth: ({ year, month }) =>
      OutMessage.ChangedViewMonth({ year, month }),
    SelectedDate: ({ date }) => OutMessage.SelectedDate({ date }),
  },
)

const PopoverBindingWithOutMessagePolicy = PopoverBinding.withOutMessagePolicy({
  fold: foldPopoverOutMessage,
})

const CalendarBindingWithOutMessagePolicy =
  CalendarBinding.withOutMessagePolicy({
    fold: foldCalendarOutMessage,
    forward: forwardCalendarOutMessage,
  })

const DatePickerComposition: Block.Composition<
  typeof DatePickerDefinition.owner,
  typeof Model,
  typeof Message,
  typeof OutMessage,
  readonly [],
  readonly [
    typeof PopoverBindingWithOutMessagePolicy,
    typeof CalendarBindingWithOutMessagePolicy,
  ]
> = DatePickerDefinition.makeComposition({
  bindings: [
    PopoverBindingWithOutMessagePolicy,
    CalendarBindingWithOutMessagePolicy,
  ],
})

/** Creates an initial DatePicker Model and Commands from a config. The selected date is
 * owned by the parent; pass its current value as `initialViewDate` to open the
 * calendar onto that month. The Calendar and Popover Blocks are created
 * with derived ids so their DOM elements stay addressable. The popover is
 * opened in `contentFocus` mode so focus lands on the calendar grid instead of
 * the panel. */
export const init = DatePickerComposition.makeInit((config: InitConfig) => ({
  model: makeInitialModel(config),
}))

/** Mount Definitions rendered by DatePicker's Popover child. */
export const mounts = DatePickerComposition.mounts

const openDatePicker = Update.combineSteps([
  PopoverBinding.requestOpen(),
  CalendarBinding.requestDropToDays(),
])
const closeDatePicker = Update.combineSteps([
  PopoverBinding.requestClose(),
  CalendarBinding.requestDropToDays(),
])
const clearDatePicker = DatePickerDefinition.makeOutMessageStep(() =>
  OutMessage.ClearedDate(),
)

/** Processes a DatePicker Message and returns the next Model, optional
 *  Commands, and an optional OutMessage. */
export const update = DatePickerComposition.makeUpdate({
  RequestedOpen: openDatePicker,
  RequestedClose: closeDatePicker,
  RequestedClear: clearDatePicker,
  Opened: openDatePicker,
  Closed: closeDatePicker,

  RequestedSelectDate: (model, { date }) =>
    CalendarBinding.requestSelectDate(date)(model),

  Cleared: clearDatePicker,

  RequestedFocusDate: (model, { date }) =>
    CalendarBinding.requestFocusDate(date)(model),

  InformedOfMinDateChange: (model, { maybeMinDate }) =>
    CalendarBinding.informMinDateChanged(maybeMinDate)(model),

  InformedOfMaxDateChange: (model, { maybeMaxDate }) =>
    CalendarBinding.informMaxDateChanged(maybeMaxDate)(model),

  InformedOfDisabledDatesChange: (model, { disabledDates }) =>
    CalendarBinding.informDisabledDatesChanged(disabledDates)(model),

  InformedOfDisabledDaysOfWeekChange: (model, { disabledDaysOfWeek }) =>
    CalendarBinding.informDisabledDaysOfWeekChanged(disabledDaysOfWeek)(model),
})

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

const implementation = {
  init,
  update,
  view,
  operations: {
    requestOpen: Message.RequestedOpen,
    requestClose: Message.RequestedClose,
    requestSelectDate: (date: CalendarDate) =>
      Tuple.make(Message.RequestedSelectDate({ date })),
    requestClear: Message.RequestedClear,
    requestFocusDate: (date: CalendarDate) =>
      Tuple.make(Message.RequestedFocusDate({ date })),
    informMinDateChanged: (maybeMinDate: Option.Option<CalendarDate>) =>
      Tuple.make(Message.InformedOfMinDateChange({ maybeMinDate })),
    informMaxDateChanged: (maybeMaxDate: Option.Option<CalendarDate>) =>
      Tuple.make(Message.InformedOfMaxDateChange({ maybeMaxDate })),
    informDisabledDatesChanged: (disabledDates: ReadonlyArray<CalendarDate>) =>
      Tuple.make(Message.InformedOfDisabledDatesChange({ disabledDates })),
    informDisabledDaysOfWeekChanged: (
      disabledDaysOfWeek: ReadonlyArray<Calendar.DayOfWeek>,
    ) =>
      Tuple.make(
        Message.InformedOfDisabledDaysOfWeekChange({ disabledDaysOfWeek }),
      ),
  },
}

const prepare = () => DatePickerComposition.prepareBlock(implementation)
/** Completed DatePicker Block contract. */
export interface DatePickerBlock extends Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> {}
/** Complete DatePicker Block definition. */
export const DatePickerBlock: DatePickerBlock = Block.assemble(prepare)

/** Moves the embedded Calendar view and cursor through DatePicker update. */
export const focusDate = DatePickerBlock.operations.requestFocusDate
