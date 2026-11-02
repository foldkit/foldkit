import { Effect, Layer, Option, Predicate, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import * as Calendar from 'foldkit/calendar'
import type { CalendarDate } from 'foldkit/calendar'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
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
  calendar: UiCalendar.CalendarBlock.Model,
  popover: Popover.PopoverBlock.Model,
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the date picker component can produce. */
export const Message = defineMessageUnion({
  RequestedSelectDate: { date: Calendar.CalendarDate },
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

/** Parent requests handled independently of local UI facts. */
export const InMessage = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  RequestedClear: {},
})
export type InMessage = typeof InMessage.Type

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

/** Configuration for creating a date picker Model. */
export const InitConfig = Schema.Struct({
  id: Schema.String,
  today: Calendar.CalendarDate,
  initialViewDate: Schema.optionalKey(Calendar.CalendarDate),
  isAnimated: Schema.optionalKey(Schema.Boolean),
  locale: Schema.optionalKey(Calendar.LocaleConfig),
  minDate: Schema.optionalKey(Calendar.CalendarDate),
  maxDate: Schema.optionalKey(Calendar.CalendarDate),
  disabledDaysOfWeek: Schema.optionalKey(Schema.Array(Calendar.DayOfWeek)),
  disabledDates: Schema.optionalKey(Schema.Array(Calendar.CalendarDate)),
})
export type InitConfig = typeof InitConfig.Type

/** @internal Stable identity of the DatePicker contract. */
export const DatePickerKey = Symbol('DatePicker')

const DatePickerDefinition = Block.makeDefinition('DatePicker', {
  key: DatePickerKey,
  Init: Schema.Tuple([InitConfig]),
  ChildInitContext: InitConfig,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
  InMessage,
  OutMessage,
  inMessageOutputs: {
    RequestedClear: { outMessage: OutMessage.ClearedDate },
  },
  operations: {
    requestSelectDate: {
      message: (date: CalendarDate) =>
        Tuple.make(Message.RequestedSelectDate({ date })),
      outMessage: OutMessage,
    },
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
})

// UPDATE

/** @internal DatePicker's Popover relationship for typed test delivery. */
export const PopoverBinding = DatePickerDefinition.makeBinding(
  Popover.PopoverBlock,
  {
    field: 'popover',
    init: {
      contextToArgs: config => [
        {
          id: `${config.id}-popover`,
          contentFocus: true,
          ...(config.isAnimated !== undefined && {
            isAnimated: config.isAnimated,
          }),
        },
      ],
    },
  },
)

/** @internal DatePicker's Calendar relationship for typed test delivery. */
export const CalendarBinding = DatePickerDefinition.makeBinding(
  UiCalendar.CalendarBlock,
  {
    field: 'calendar',
    init: {
      contextToArgs: config => [
        {
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
        },
      ],
    },
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

const DatePickerComposition = DatePickerDefinition.makeComposition({
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
  model: { id: config.id },
  childInitContext: config,
}))

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

/** Applies parent requests through the shared date-picker transitions. */
export const receive = DatePickerComposition.makeReceive({
  RequestedOpen: openDatePicker,
  RequestedClose: closeDatePicker,
  RequestedClear: clearDatePicker,
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
export const view = DatePickerComposition.makeView.withInputs(
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

type DatePickerContract = typeof DatePickerDefinition.contract
/** Public DatePicker contract independent of its Calendar and Popover implementations. */
export interface DatePickerBlock extends DatePickerContract {}
/** Passive DatePicker contract selected through the module implementation Layer. */
export const DatePickerBlock: DatePickerBlock = DatePickerDefinition.contract

const block = DatePickerDefinition.makeBlock(
  Effect.gen(function* () {
    const popover = yield* PopoverBindingWithOutMessagePolicy
    const calendar = yield* CalendarBindingWithOutMessagePolicy
    return { children: [popover, calendar], init, update, receive, view }
  }),
).provide(Layer.mergeAll(Popover.layer, UiCalendar.layer))

/** Supplies DatePicker and both child implementations without initializing their Models. */
export const layer = block.layer
