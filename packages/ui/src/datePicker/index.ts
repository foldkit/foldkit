import { Function, Match as M, Option, Predicate, Schema as S } from 'effect'
import * as Calendar from 'foldkit/calendar'
import type { CalendarDate } from 'foldkit/calendar'
import * as Command from 'foldkit/command'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import { type Reflect, defineView } from 'foldkit/submodel'
import * as Update from 'foldkit/update'

import type { AnchorConfig } from '../anchor/index.js'
import * as UiCalendar from '../calendar/index.js'
import { idSelector } from '../internal/selectors.js'
import * as Popover from '../popover/index.js'

// MODEL

/** Schema for the date picker component's private interaction state. The
 * selected date is owned by the parent and passed in via
 * `ViewInputs.maybeSelectedDate`. This holds the embedded Calendar submodel
 * (the visible grid) and the embedded Popover submodel (the open/close +
 * transition layer). */
export const Model = S.Struct({
  id: S.String,
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
    year: S.Int,
    month: S.Int,
  },
  SelectedDate: { date: Calendar.CalendarDate },
  ClearedDate: {},
})
export type OutMessage = typeof OutMessage.Type

export type ChangedViewMonth = typeof OutMessage.ChangedViewMonth.Type
export type SelectedDate = typeof OutMessage.SelectedDate.Type
export type ClearedDate = typeof OutMessage.ClearedDate.Type

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
 * calendar onto that month. The calendar and popover submodels are created
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

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const mapCalendarCommands = (
  commands: ReadonlyArray<Command.Command<UiCalendar.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  Command.mapMessages(commands, message =>
    Message.GotCalendarMessage({ message }),
  )

const mapPopoverCommands = (
  commands: ReadonlyArray<Command.Command<Popover.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  Command.mapMessages(commands, message =>
    Message.GotPopoverMessage({ message }),
  )

const dropCalendarToDays: Update.Step<Model, Message> = model => ({
  model: evo(model, { calendar: () => UiCalendar.dropToDays(model.calendar) }),
})

const readPopover = (model: Model): Option.Option<Popover.Model> =>
  Option.some(model.popover)

const writePopover = (model: Model, nextPopover: Popover.Model): Model =>
  evo(model, { popover: () => nextPopover })

const toGotPopoverMessage = (message: Popover.Message): Message =>
  Message.GotPopoverMessage({ message })

const foldPopoverOutMessage = M.type<Popover.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Opened: () => dropCalendarToDays,
    Closed: () => dropCalendarToDays,
  }),
)

const foldPopover = Update.foldChild({
  update: Popover.update,
  read: readPopover,
  write: writePopover,
  toParentMessage: toGotPopoverMessage,
  toParentOutMessage: () => undefined,
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverOpen = Update.foldChildStep({
  update: Popover.open,
  read: readPopover,
  write: writePopover,
  toParentMessage: toGotPopoverMessage,
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverClose = Update.foldChildStep({
  update: Popover.close,
  read: readPopover,
  write: writePopover,
  toParentMessage: toGotPopoverMessage,
  foldOutMessage: foldPopoverOutMessage,
})

const foldCalendarOutMessage = M.type<UiCalendar.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ChangedViewMonth: () => model => ({ model }),
    SelectedDate: () => foldPopoverClose,
  }),
)

const toDatePickerOutMessage: (
  outMessage: UiCalendar.OutMessage,
) => OutMessage = M.type<UiCalendar.OutMessage>().pipe(
  M.withReturnType<OutMessage>(),
  M.tagsExhaustive({
    ChangedViewMonth: ({ year, month }) =>
      OutMessage.ChangedViewMonth({ year, month }),
    SelectedDate: ({ date }) => OutMessage.SelectedDate({ date }),
  }),
)

const foldCalendar = Update.foldChild({
  update: UiCalendar.update,
  read: (model: Model) => Option.some(model.calendar),
  write: (model, nextCalendar) => evo(model, { calendar: () => nextCalendar }),
  toParentMessage: message => Message.GotCalendarMessage({ message }),
  toParentOutMessage: toDatePickerOutMessage,
  foldOutMessage: foldCalendarOutMessage,
})

/** Processes a date picker message and returns the next model, commands, and
 * optional OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotCalendarMessage: ({ message: calendarMessage }) =>
      foldCalendar(model, calendarMessage),

    GotPopoverMessage: ({ message: popoverMessage }) =>
      foldPopover(model, popoverMessage),

    Opened: () => Update.combine(model, [foldPopoverOpen, dropCalendarToDays]),

    Closed: () => Update.combine(model, [foldPopoverClose, dropCalendarToDays]),

    RequestedSelectDate: ({ date }) => {
      const uiCalendarSelectDateResult = UiCalendar.selectDate(
        model.calendar,
        date,
      )
      const popoverCloseResult = Popover.close(model.popover)
      return {
        model: evo(model, {
          calendar: () => uiCalendarSelectDateResult.model,
          popover: () => popoverCloseResult.model,
        }),
        commands: [
          ...mapCalendarCommands(uiCalendarSelectDateResult.commands ?? []),
          ...mapPopoverCommands(popoverCloseResult.commands ?? []),
        ],
        outMessage: OutMessage.SelectedDate({ date }),
      }
    },

    Cleared: () => ({ model, outMessage: OutMessage.ClearedDate() }),
  })

/** Programmatically opens the date picker, updating the model and returning
 * focus and popover commands. Use this in domain-event handlers. */
export const open = (model: Model): UpdateReturn =>
  update(model, Message.Opened())

/** Programmatically closes the date picker. Use this in domain-event handlers. */
export const close = (model: Model): UpdateReturn =>
  update(model, Message.Closed())

/** Programmatically selects a date, committing it and closing the popover. Emits a `SelectedDate` OutMessage just like a user-initiated selection. */
export const selectDate = (model: Model, date: CalendarDate): UpdateReturn =>
  update(model, Message.RequestedSelectDate({ date }))

/** Programmatically clears the selected date. */
export const clear = (model: Model): UpdateReturn =>
  update(model, Message.Cleared())

/** Moves the embedded calendar's view and cursor to a date without changing
 *  the selection (which the parent owns). Use it to navigate the picker onto a
 *  known date, for example after the parent sets its value externally (a URL
 *  parameter, a saved draft) so opening the picker shows that month. Returns
 *  the model directly because it produces no commands and no OutMessage. */
export const focusDate: Reflect<Model, CalendarDate> = Function.dual(
  2,
  (model: Model, date: CalendarDate): Model =>
    evo(model, {
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

// SELECTORS

/** Returns the bare DOM id of the date picker trigger button, derived from
 *  the date picker's base id. The trigger is the embedded Popover's button,
 *  so the id is suffixed `-popover-button`. Use this to associate an external
 *  label with the trigger via a native `<label for={DatePicker.triggerId(id)}>`
 *  or an `aria-labelledby` reference. */
export const triggerId = (id: string): string => `${id}-popover-button`

// VIEW

const encodeIsoDate = S.encodeSync(Calendar.CalendarDateFromIsoString)

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *
 *  The DatePicker emits a `SelectedDate({ date })` OutMessage when the
 *  user commits a date. Consumers pattern-match this in their
 *  `GotDatePickerMessage` handler (the optional `outMessage` field of
 *  `DatePicker.update`'s return) to lift the date into domain state. */
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
}>

/** Renders an accessible date picker: a trigger button that opens a popover
 * containing an accessible calendar grid. The date picker assembles the
 * embedded Calendar and Popover components into one flat API. Consumers
 * provide the trigger face and the calendar grid layout, DatePicker handles
 * focus choreography, open/close state, and form submission. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
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

    const calendarVNode = h.submodel({
      slotId: model.calendar.id,
      model: model.calendar,
      view: UiCalendar.view,
      viewInputs: { maybeSelectedDate, toView: toCalendarView },
      toParentMessage: message => Message.GotCalendarMessage({ message }),
    })

    const popoverVNode = h.submodel({
      slotId: model.popover.id,
      model: model.popover,
      view: Popover.view,
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
      toParentMessage: message => Message.GotPopoverMessage({ message }),
    })

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
