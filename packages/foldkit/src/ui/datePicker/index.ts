import { Function, Match as M, Option, Schema as S } from 'effect'

import * as Calendar from '../../calendar/index.js'
import type { CalendarDate } from '../../calendar/index.js'
import * as Command from '../../command/index.js'
import {
  type ChildAttribute,
  type Html,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type { Reflect } from '../../submodel/submodel.js'
import type { AnchorConfig } from '../anchor.js'
import * as UiCalendar from '../calendar/index.js'
import * as Popover from '../popover/index.js'

// MODEL

/** Schema for the date picker component's state. Holds the selected date,
 * the embedded Calendar submodel (the visible grid), and the embedded Popover
 * submodel (the open/close + transition layer). */
export const Model = S.Struct({
  id: S.String,
  maybeSelectedDate: S.Option(Calendar.CalendarDate),
  calendar: UiCalendar.Model,
  popover: Popover.Model,
})
export type Model = typeof Model.Type

// MESSAGE

/** Wraps a Calendar submodel message for delegation. */
export const GotCalendarMessage = m('GotCalendarMessage', {
  message: UiCalendar.Message,
})
/** Wraps a Popover submodel message for delegation. */
export const GotPopoverMessage = m('GotPopoverMessage', {
  message: Popover.Message,
})
/** Sent when the user commits a date via click or keyboard. Updates the
 * selected date, syncs the calendar, and closes the popover. */
export const RequestedSelectDate = m('RequestedSelectDate', {
  date: Calendar.CalendarDate,
})
/** Sent when the user clears the selected date. Does not close the popover. */
export const Cleared = m('Cleared')
/** Sent when the popover should open. Triggers focus-grid on the embedded
 * Calendar so keyboard focus lands inside the grid instead of the panel. */
export const Opened = m('Opened')
/** Sent when the popover should close. Delegates to Popover which returns
 * focus to the trigger button. */
export const Closed = m('Closed')

/** Union of all messages the date picker component can produce. */
export const Message: S.Union<
  [
    typeof GotCalendarMessage,
    typeof GotPopoverMessage,
    typeof RequestedSelectDate,
    typeof Cleared,
    typeof Opened,
    typeof Closed,
  ]
> = S.Union([
  GotCalendarMessage,
  GotPopoverMessage,
  RequestedSelectDate,
  Cleared,
  Opened,
  Closed,
])
export type Message = typeof Message.Type

// OUT MESSAGE

/** Emitted when the visible month changes (propagated from the embedded
 * Calendar). Useful for month-scoped data loading. */
export const ChangedViewMonth = m('ChangedViewMonth', {
  year: S.Int,
  month: S.Int,
})

/** Emitted when the user commits a date selection (propagated from the
 * embedded Calendar). The popover has already closed; the parent reads the
 * committed date and lifts it into domain state. */
export const SelectedDate = m('SelectedDate', {
  date: Calendar.CalendarDate,
})

/** Union of out-messages the date picker can produce. */
export const OutMessage = S.Union([ChangedViewMonth, SelectedDate])
export type OutMessage = typeof OutMessage.Type

export type ChangedViewMonth = typeof ChangedViewMonth.Type
export type SelectedDate = typeof SelectedDate.Type

// INIT

/** Configuration for creating a date picker model with `init`. */
export type InitConfig = Readonly<{
  id: string
  today: CalendarDate
  initialSelectedDate?: CalendarDate
  isAnimated?: boolean
  locale?: Calendar.LocaleConfig
  minDate?: CalendarDate
  maxDate?: CalendarDate
  disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
  disabledDates?: ReadonlyArray<CalendarDate>
}>

/** Creates an initial date picker model from a config. The calendar and
 * popover submodels are created with derived ids so their DOM elements stay
 * addressable. The popover is opened in `contentFocus` mode so focus lands on
 * the calendar grid instead of the panel. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  maybeSelectedDate: Option.fromNullishOr(config.initialSelectedDate),
  calendar: UiCalendar.init({
    id: `${config.id}-calendar`,
    today: config.today,
    ...(config.initialSelectedDate !== undefined && {
      initialSelectedDate: config.initialSelectedDate,
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

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const mapCalendarCommands = (
  commands: ReadonlyArray<Command.Command<UiCalendar.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  Command.mapMessages(commands, message => GotCalendarMessage({ message }))

const mapPopoverCommands = (
  commands: ReadonlyArray<Command.Command<Popover.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  Command.mapMessages(commands, message => GotPopoverMessage({ message }))

const delegateToCalendar = (
  model: Model,
  calendarMessage: UiCalendar.Message,
): UpdateReturn => {
  const [nextCalendar, calendarCommands, maybeCalendarOutMessage] =
    UiCalendar.update(model.calendar, calendarMessage)

  const modelWithCalendar = evo(model, { calendar: () => nextCalendar })

  return Option.match(maybeCalendarOutMessage, {
    onNone: (): UpdateReturn => [
      modelWithCalendar,
      mapCalendarCommands(calendarCommands),
      Option.none(),
    ],
    onSome: M.type<UiCalendar.OutMessage>().pipe(
      M.withReturnType<UpdateReturn>(),
      M.tagsExhaustive({
        ChangedViewMonth: ({ year, month }) => [
          modelWithCalendar,
          mapCalendarCommands(calendarCommands),
          Option.some(ChangedViewMonth({ year, month })),
        ],
        SelectedDate: ({ date }) => {
          const [nextPopover, popoverCommands] = Popover.close(model.popover)
          return [
            evo(modelWithCalendar, {
              maybeSelectedDate: () => Option.some(date),
              popover: () => nextPopover,
            }),
            [
              ...mapCalendarCommands(calendarCommands),
              ...mapPopoverCommands(popoverCommands),
            ],
            Option.some(SelectedDate({ date })),
          ]
        },
      }),
    ),
  })
}

const delegateToPopover = (
  model: Model,
  popoverMessage: Popover.Message,
): UpdateReturn => {
  const [nextPopover, popoverCommands, maybePopoverOutMessage] = Popover.update(
    model.popover,
    popoverMessage,
  )
  const modelWithPopover = evo(model, { popover: () => nextPopover })

  return Option.match(maybePopoverOutMessage, {
    onNone: (): UpdateReturn => [
      modelWithPopover,
      mapPopoverCommands(popoverCommands),
      Option.none(),
    ],
    onSome: (): UpdateReturn => [
      evo(modelWithPopover, {
        calendar: () => UiCalendar.dropToDays(modelWithPopover.calendar),
      }),
      mapPopoverCommands(popoverCommands),
      Option.none(),
    ],
  })
}

/** Processes a date picker message and returns the next model, commands, and
 * optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotCalendarMessage: ({ message: calendarMessage }) =>
        delegateToCalendar(model, calendarMessage),

      GotPopoverMessage: ({ message: popoverMessage }) =>
        delegateToPopover(model, popoverMessage),

      Opened: () => {
        const [nextPopover, popoverCommands] = Popover.open(model.popover)
        return [
          evo(model, {
            popover: () => nextPopover,
            calendar: () => UiCalendar.dropToDays(model.calendar),
          }),
          mapPopoverCommands(popoverCommands),
          Option.none(),
        ]
      },

      Closed: () => {
        const [nextPopover, popoverCommands] = Popover.close(model.popover)
        return [
          evo(model, {
            popover: () => nextPopover,
            calendar: () => UiCalendar.dropToDays(model.calendar),
          }),
          mapPopoverCommands(popoverCommands),
          Option.none(),
        ]
      },

      RequestedSelectDate: ({ date }) => {
        const [nextCalendar, calendarCommands] = UiCalendar.selectDate(
          model.calendar,
          date,
        )
        const [nextPopover, popoverCommands] = Popover.close(model.popover)
        return [
          evo(model, {
            maybeSelectedDate: () => Option.some(date),
            calendar: () => nextCalendar,
            popover: () => nextPopover,
          }),
          [
            ...mapCalendarCommands(calendarCommands),
            ...mapPopoverCommands(popoverCommands),
          ],
          Option.some(SelectedDate({ date })),
        ]
      },

      Cleared: () => [
        evo(model, {
          maybeSelectedDate: () => Option.none(),
          calendar: UiCalendar.reflectSelectedDate(Option.none()),
        }),
        [],
        Option.none(),
      ],
    }),
  )

/** Programmatically opens the date picker, updating the model and returning
 * focus and popover commands. Use this in domain-event handlers. */
export const open = (model: Model): UpdateReturn => update(model, Opened())

/** Programmatically closes the date picker. Use this in domain-event handlers. */
export const close = (model: Model): UpdateReturn => update(model, Closed())

/** Programmatically selects a date, committing it and closing the popover. Emits a `SelectedDate` OutMessage just like a user-initiated selection. */
export const selectDate = (model: Model, date: CalendarDate): UpdateReturn =>
  update(model, RequestedSelectDate({ date }))

/** Programmatically clears the selected date. */
export const clear = (model: Model): UpdateReturn => update(model, Cleared())

/** Reflects an externally-sourced selected date onto the date picker
 *  without emitting an OutMessage or touching the popover. Sets the
 *  picker's selection and reflects it onto the embedded calendar (moving
 *  the calendar's view to the date), mirroring `selectDate`'s state change
 *  minus the `SelectedDate` announcement and the popover close. Pass
 *  `Option.none()` to clear. Use this to mirror external truth (a URL
 *  parameter, a saved draft) onto the picker. Contrast with `selectDate`,
 *  a user or programmatic *choice* that emits `SelectedDate`. Returns the
 *  model directly because it produces no commands and no OutMessage. */
export const reflectSelectedDate: Reflect<
  Model,
  Option.Option<CalendarDate>
> = Function.dual(
  2,
  (model: Model, maybeDate: Option.Option<CalendarDate>): Model =>
    evo(model, {
      maybeSelectedDate: () => maybeDate,
      calendar: () => UiCalendar.reflectSelectedDate(model.calendar, maybeDate),
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
export const reflectMinDate: Reflect<
  Model,
  Option.Option<CalendarDate>
> = Function.dual(
  2,
  (model: Model, maybeMinDate: Option.Option<CalendarDate>): Model =>
    evo(model, {
      calendar: () => UiCalendar.reflectMinDate(model.calendar, maybeMinDate),
    }),
)

/** Reflects the maximum selectable date onto the embedded calendar. Pass
 * `Option.none()` to remove the maximum. Does NOT reconcile the current
 * selection. */
export const reflectMaxDate: Reflect<
  Model,
  Option.Option<CalendarDate>
> = Function.dual(
  2,
  (model: Model, maybeMaxDate: Option.Option<CalendarDate>): Model =>
    evo(model, {
      calendar: () => UiCalendar.reflectMaxDate(model.calendar, maybeMaxDate),
    }),
)

/** Reflects the list of individually-disabled dates onto the embedded
 * calendar. Pass an empty array to clear. Does NOT reconcile the current
 * selection. */
export const reflectDisabledDates: Reflect<
  Model,
  ReadonlyArray<CalendarDate>
> = Function.dual(
  2,
  (model: Model, disabledDates: ReadonlyArray<CalendarDate>): Model =>
    evo(model, {
      calendar: () =>
        UiCalendar.reflectDisabledDates(model.calendar, disabledDates),
    }),
)

/** Reflects the days of the week that are disabled onto the embedded calendar
 * (e.g. weekends). Pass an empty array to clear. Does NOT reconcile the
 * current selection. */
export const reflectDisabledDaysOfWeek: Reflect<
  Model,
  ReadonlyArray<Calendar.DayOfWeek>
> = Function.dual(
  2,
  (
    model: Model,
    disabledDaysOfWeek: ReadonlyArray<Calendar.DayOfWeek>,
  ): Model =>
    evo(model, {
      calendar: () =>
        UiCalendar.reflectDisabledDaysOfWeek(
          model.calendar,
          disabledDaysOfWeek,
        ),
    }),
)

// VIEW

const encodeIsoDate = S.encodeSync(Calendar.CalendarDateFromIsoString)

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *
 *  The DatePicker emits a `SelectedDate({ date })` OutMessage when the
 *  user commits a date. Consumers pattern-match this in their
 *  `GotDatePickerMessage` handler (third tuple element of
 *  `Ui.DatePicker.update`'s return) to lift the date into domain state. */
export type ViewInputs = Readonly<{
  anchor: AnchorConfig
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
  panelClassName?: string
  panelAttributes?: ReadonlyArray<ChildAttribute>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<ChildAttribute>
}>

/** Renders an accessible date picker: a trigger button that opens a popover
 * containing an accessible calendar grid. The date picker assembles the
 * embedded Calendar and Popover components into one flat API. Consumers
 * provide the trigger face and the calendar grid layout, DatePicker handles
 * focus choreography, open/close state, and form submission. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const {
      anchor,
      triggerContent,
      toCalendarView,
      isDisabled,
      name,
      className,
      attributes = [],
      triggerClassName,
      triggerAttributes = [],
      panelClassName,
      panelAttributes = [],
      backdropClassName,
      backdropAttributes = [],
    } = viewInputs

    const calendarVNode = h.submodel({
      slotId: model.calendar.id,
      model: model.calendar,
      view: UiCalendar.view,
      viewInputs: { toView: toCalendarView },
      toParentMessage: message => GotCalendarMessage({ message }),
    })

    const popoverVNode = h.submodel({
      slotId: model.popover.id,
      model: model.popover,
      view: Popover.view,
      viewInputs: {
        anchor,
        ...(isDisabled !== undefined && { isDisabled }),
        focusSelector: `#${model.calendar.id}-grid`,
        toView: ({ button, panel, backdrop, isVisible }) =>
          h.div(
            [],
            [
              h.button(
                [
                  ...button,
                  ...(triggerClassName !== undefined
                    ? [h.Class(triggerClassName)]
                    : []),
                  ...triggerAttributes,
                ],
                [triggerContent(model.maybeSelectedDate)],
              ),
              ...(isVisible
                ? [
                    h.div(
                      [
                        ...backdrop,
                        ...(backdropClassName !== undefined
                          ? [h.Class(backdropClassName)]
                          : []),
                        ...backdropAttributes,
                      ],
                      [],
                    ),
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
      toParentMessage: message => GotPopoverMessage({ message }),
    })

    const hiddenInputValue = Option.match(model.maybeSelectedDate, {
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
