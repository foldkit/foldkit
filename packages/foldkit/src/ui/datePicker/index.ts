import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Calendar from '../../calendar/index.js'
import type { CalendarDate } from '../../calendar/index.js'
import * as Command from '../../command/index.js'
import {
  type Attribute,
  type Html,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
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
export const SelectedDate = m('SelectedDate', { date: Calendar.CalendarDate })
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
    typeof SelectedDate,
    typeof Cleared,
    typeof Opened,
    typeof Closed,
  ]
> = S.Union([
  GotCalendarMessage,
  GotPopoverMessage,
  SelectedDate,
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

/** The date picker's OutMessage. Matches Calendar — only `ChangedViewMonth`.
 * Date selection goes through the `onSelectedDate` ViewConfig callback, not
 * OutMessage. */
export const OutMessage = ChangedViewMonth
export type OutMessage = typeof OutMessage.Type

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
  commands.map(
    Command.mapEffect(Effect.map(message => GotCalendarMessage({ message }))),
  )

const mapPopoverCommands = (
  commands: ReadonlyArray<Command.Command<Popover.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  commands.map(
    Command.mapEffect(Effect.map(message => GotPopoverMessage({ message }))),
  )

const mapCalendarOutMessage = (
  maybeOutMessage: Option.Option<UiCalendar.OutMessage>,
): Option.Option<OutMessage> =>
  Option.map(
    maybeOutMessage,
    M.type<UiCalendar.OutMessage>().pipe(
      M.tagsExhaustive({
        ChangedViewMonth: ({ year, month }) =>
          ChangedViewMonth({ year, month }),
      }),
    ),
  )

const delegateToCalendar = (
  model: Model,
  calendarMessage: UiCalendar.Message,
): UpdateReturn => {
  const [nextCalendar, calendarCommands, maybeCalendarOutMessage] =
    UiCalendar.update(model.calendar, calendarMessage)
  return [
    evo(model, { calendar: () => nextCalendar }),
    mapCalendarCommands(calendarCommands),
    mapCalendarOutMessage(maybeCalendarOutMessage),
  ]
}

const delegateToPopover = (
  model: Model,
  popoverMessage: Popover.Message,
): UpdateReturn => {
  const [nextPopover, popoverCommands] = Popover.update(
    model.popover,
    popoverMessage,
  )
  return [
    evo(model, { popover: () => nextPopover }),
    mapPopoverCommands(popoverCommands),
    Option.none(),
  ]
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

      SelectedDate: ({ date }) => {
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
          Option.none(),
        ]
      },

      Cleared: () => [
        evo(model, { maybeSelectedDate: () => Option.none() }),
        [],
        Option.none(),
      ],
    }),
  )

/** Programmatically opens the date picker, updating the model and returning
 * focus and popover commands. Use this in domain-event handlers. */
export const open = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextModel, commands] = toModelAndCommands(update(model, Opened()))
  return [nextModel, commands]
}

/** Programmatically closes the date picker. Use this in domain-event handlers. */
export const close = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextModel, commands] = toModelAndCommands(update(model, Closed()))
  return [nextModel, commands]
}

/** Programmatically selects a date, committing it and closing the popover. */
export const selectDate = (
  model: Model,
  date: CalendarDate,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextModel, commands] = toModelAndCommands(
    update(model, SelectedDate({ date })),
  )
  return [nextModel, commands]
}

/** Programmatically clears the selected date. */
export const clear = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextModel, commands] = toModelAndCommands(update(model, Cleared()))
  return [nextModel, commands]
}

/** Sets the minimum selectable date on the embedded calendar. Pass
 * `Option.none()` to remove the minimum. Use this when the minimum derives
 * from other Model state (e.g. a start date field whose current selection
 * constrains an end date picker).
 *
 * Does NOT reconcile the current selection — if a previously-selected date
 * is now below the new minimum, it remains selected. Callers should `clear`
 * or reassign the selection explicitly if their domain requires it. */
export const setMinDate = (
  model: Model,
  maybeMinDate: Option.Option<CalendarDate>,
): Model =>
  evo(model, {
    calendar: () => UiCalendar.setMinDate(model.calendar, maybeMinDate),
  })

/** Sets the maximum selectable date on the embedded calendar. Pass
 * `Option.none()` to remove the maximum. Does NOT reconcile the current
 * selection. */
export const setMaxDate = (
  model: Model,
  maybeMaxDate: Option.Option<CalendarDate>,
): Model =>
  evo(model, {
    calendar: () => UiCalendar.setMaxDate(model.calendar, maybeMaxDate),
  })

/** Sets the list of individually-disabled dates on the embedded calendar.
 * Pass an empty array to clear. Does NOT reconcile the current selection. */
export const setDisabledDates = (
  model: Model,
  disabledDates: ReadonlyArray<CalendarDate>,
): Model =>
  evo(model, {
    calendar: () => UiCalendar.setDisabledDates(model.calendar, disabledDates),
  })

/** Sets the days of the week that are disabled on the embedded calendar
 * (e.g. weekends). Pass an empty array to clear. Does NOT reconcile the
 * current selection. */
export const setDisabledDaysOfWeek = (
  model: Model,
  disabledDaysOfWeek: ReadonlyArray<Calendar.DayOfWeek>,
): Model =>
  evo(model, {
    calendar: () =>
      UiCalendar.setDisabledDaysOfWeek(model.calendar, disabledDaysOfWeek),
  })

const toModelAndCommands = (
  result: UpdateReturn,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextModel, commands] = result
  return [nextModel, commands]
}

// VIEW

const encodeIsoDate = S.encodeSync(Calendar.CalendarDateFromIsoString)

/** Configuration for rendering a date picker with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => ParentMessage
  /** Optional controlled-mode callback invoked when the user commits a date.
   * When provided, the view dispatches this directly (parent owns the event).
   * When omitted, DatePicker manages its own selection state. In controlled
   * mode, use `DatePicker.selectDate(model, date)` to write the selection
   * back into the date picker's internal state. */
  onSelectedDate?: (date: CalendarDate) => ParentMessage
  anchor: AnchorConfig
  /** Renders the trigger button's content (typically the formatted selected
   * date or a placeholder). Receives the current selection. */
  triggerContent: (maybeDate: Option.Option<CalendarDate>) => Html
  /** Renders the calendar grid layout inside the popover panel. Mirrors
   * `Calendar.ViewConfig['toView']` — the consumer lays out the attribute
   * groups exactly as they would for an inline calendar. */
  toCalendarView: (
    attributes: UiCalendar.CalendarAttributes<ParentMessage>,
  ) => Html
  isDisabled?: boolean
  /** Name for the hidden form input. When provided, a hidden `<input>` is
   * rendered alongside the trigger so native form submission captures the
   * selected date as an ISO string (`YYYY-MM-DD`). */
  name?: string
  className?: string
  attributes?: ReadonlyArray<Attribute<ParentMessage>>
  triggerClassName?: string
  triggerAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Renders an accessible date picker: a trigger button that opens a popover
 * containing an accessible calendar grid. The date picker assembles the
 * embedded Calendar and Popover components into one flat API — consumers
 * provide the trigger face and the calendar grid layout, DatePicker handles
 * focus choreography, open/close state, and form submission. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const { Class, Name, Type, Value, div, input } = html<ParentMessage>()

  const {
    model,
    toParentMessage,
    onSelectedDate,
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
  } = config

  const dispatchSelectedDate = (date: CalendarDate): ParentMessage =>
    onSelectedDate !== undefined
      ? onSelectedDate(date)
      : toParentMessage(SelectedDate({ date }))

  const calendarVNode = UiCalendar.view<ParentMessage>({
    model: model.calendar,
    toParentMessage: message =>
      toParentMessage(GotCalendarMessage({ message })),
    onSelectedDate: dispatchSelectedDate,
    toView: toCalendarView,
  })

  const popoverVNode = Popover.view<ParentMessage>({
    model: model.popover,
    toParentMessage: message => toParentMessage(GotPopoverMessage({ message })),
    onOpened: () => toParentMessage(Opened()),
    onClosed: () => toParentMessage(Closed()),
    anchor,
    buttonContent: triggerContent(model.maybeSelectedDate),
    panelContent: calendarVNode,
    focusSelector: `#${model.calendar.id}-grid`,
    ...(isDisabled !== undefined && { isDisabled }),
    ...(triggerClassName !== undefined && {
      buttonClassName: triggerClassName,
    }),
    buttonAttributes: triggerAttributes,
    ...(panelClassName !== undefined && { panelClassName }),
    panelAttributes,
    ...(backdropClassName !== undefined && { backdropClassName }),
    backdropAttributes,
  })

  const hiddenInputValue = Option.match(model.maybeSelectedDate, {
    onNone: () => '',
    onSome: encodeIsoDate,
  })

  const maybeHiddenInput: ReadonlyArray<Html> =
    name !== undefined
      ? [input([Type('hidden'), Name(name), Value(hiddenInputValue)])]
      : []

  const wrapperAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    ...(className !== undefined ? [Class(className)] : []),
    ...attributes,
  ]

  return div(wrapperAttributes, [popoverVNode, ...maybeHiddenInput])
}

/** Creates a memoized date picker view. Static config is captured in a closure;
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
        currentToParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToParentMessage,
        }),
      [model, toParentMessage],
    )
}
