import { Duration, Effect, Match, Number, Option, Schema } from 'effect'
import * as Command from 'foldkit/command'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { evo } from 'foldkit/struct'
import { defineView } from 'foldkit/submodel'
import * as Update from 'foldkit/update'

import { Message, OutMessage } from './message.js'

// MODEL

const FocusLocation = Schema.Literals(['Trigger', 'Panel'])
type FocusLocation = typeof FocusLocation.Type

/** Schema for HoverIntent state. It tracks pointer and focus engagement over a trigger and its panel, visibility, delay timers, and Escape dismissal. */
export const Model = Schema.Struct({
  isOpen: Schema.Boolean,
  isTriggerHovered: Schema.Boolean,
  isPanelHovered: Schema.Boolean,
  maybeFocusLocation: Schema.Option(FocusLocation),
  isDismissed: Schema.Boolean,
  openDelay: Schema.DurationFromMillis,
  closeDelay: Schema.DurationFromMillis,
  pendingOpenVersion: Schema.Number,
  pendingCloseVersion: Schema.Number,
})
export type Model = typeof Model.Type

const DEFAULT_OPEN_DELAY = Duration.millis(200)
const DEFAULT_CLOSE_DELAY = Duration.millis(300)

/** Configuration for creating a HoverIntent Model. */
export type InitConfig = Readonly<{
  openDelay?: Duration.Input
  closeDelay?: Duration.Input
}>

/** Creates a HoverIntent Model. Pointer entry opens after 200 milliseconds and pointer departure closes after a 300-millisecond grace period by default. Focus entry opens immediately, and focus departure closes without that pointer grace period. */
export const init = (config: InitConfig = {}): Model => ({
  isOpen: false,
  isTriggerHovered: false,
  isPanelHovered: false,
  maybeFocusLocation: Option.none(),
  isDismissed: false,
  openDelay:
    config.openDelay === undefined
      ? DEFAULT_OPEN_DELAY
      : Duration.fromInputUnsafe(config.openDelay),
  closeDelay:
    config.closeDelay === undefined
      ? DEFAULT_CLOSE_DELAY
      : Duration.fromInputUnsafe(config.closeDelay),
  pendingOpenVersion: 0,
  pendingCloseVersion: 0,
})

// COMMAND

/** Waits before opening, then emits the version that scheduled the wait. */
export const WaitBeforeOpening = Command.define('WaitBeforeOpening', {
  args: { delay: Schema.DurationFromMillis, version: Schema.Number },
  messages: [Message.CompletedWaitBeforeOpening],
  execute: ({ delay, version }) =>
    Effect.sleep(delay).pipe(
      Effect.as(Message.CompletedWaitBeforeOpening({ version })),
    ),
})

/** Waits before closing, then emits the version that scheduled the wait. */
export const WaitBeforeClosing = Command.define('WaitBeforeClosing', {
  args: { delay: Schema.DurationFromMillis, version: Schema.Number },
  messages: [Message.CompletedWaitBeforeClosing],
  execute: ({ delay, version }) =>
    Effect.sleep(delay).pipe(
      Effect.as(Message.CompletedWaitBeforeClosing({ version })),
    ),
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const isPointerOver = (model: Model): boolean =>
  model.isTriggerHovered || model.isPanelHovered

const isEngaged = (model: Model): boolean =>
  isPointerOver(model) || Option.isSome(model.maybeFocusLocation)

const open = (model: Model): UpdateReturn => {
  if (model.isOpen) {
    return { model }
  }

  return {
    model: evo(model, { isOpen: () => true }),
    outMessage: OutMessage.Opened(),
  }
}

const finishClosing = (model: Model): UpdateReturn => {
  if (!model.isOpen) {
    return { model }
  }

  return {
    model: evo(model, { isOpen: () => false }),
    outMessage: OutMessage.Closed(),
  }
}

const scheduleOpen = (model: Model): UpdateReturn => {
  const version = Number.increment(model.pendingOpenVersion)
  return {
    model: evo(model, { pendingOpenVersion: () => version }),
    commands: [WaitBeforeOpening({ delay: model.openDelay, version })],
  }
}

const scheduleClose = (
  model: Model,
  delay: Duration.Duration,
): UpdateReturn => {
  const version = Number.increment(model.pendingCloseVersion)
  return {
    model: evo(model, { pendingCloseVersion: () => version }),
    commands: [WaitBeforeClosing({ delay, version })],
  }
}

const entered = (model: Model): UpdateReturn => {
  const enteredModel = evo(model, {
    pendingCloseVersion: Number.increment,
  })

  if (enteredModel.isOpen || enteredModel.isDismissed) {
    return { model: enteredModel }
  }

  return scheduleOpen(enteredModel)
}

const left = (model: Model): UpdateReturn => {
  const leftModel = evo(model, {
    pendingOpenVersion: Number.increment,
  })

  if (isEngaged(leftModel)) {
    return { model: leftModel }
  }

  if (leftModel.isDismissed) {
    return { model: evo(leftModel, { isDismissed: () => false }) }
  }

  if (!leftModel.isOpen) {
    return { model: leftModel }
  }

  return scheduleClose(leftModel, leftModel.closeDelay)
}

const focused = (model: Model, focusLocation: FocusLocation): UpdateReturn => {
  const focusedModel = evo(model, {
    maybeFocusLocation: () => Option.some(focusLocation),
    pendingOpenVersion: Number.increment,
    pendingCloseVersion: Number.increment,
  })

  if (focusedModel.isDismissed) {
    return { model: focusedModel }
  }

  return open(focusedModel)
}

const blurred = (model: Model): UpdateReturn => {
  const blurredModel = evo(model, {
    maybeFocusLocation: () => Option.none(),
    pendingOpenVersion: Number.increment,
  })

  if (isEngaged(blurredModel)) {
    return { model: blurredModel }
  }

  if (blurredModel.isDismissed) {
    return { model: evo(blurredModel, { isDismissed: () => false }) }
  }

  if (!blurredModel.isOpen) {
    return { model: blurredModel }
  }

  return scheduleClose(blurredModel, Duration.zero)
}

const dismiss = (model: Model, isTriggerFocused: boolean): UpdateReturn => {
  const maybeFocusLocation = Option.liftPredicate<FocusLocation>(
    'Trigger',
    () => isTriggerFocused,
  )
  const dismissedModel = evo(model, {
    isOpen: () => false,
    isPanelHovered: () => false,
    maybeFocusLocation: () => maybeFocusLocation,
    isDismissed: () => model.isTriggerHovered || isTriggerFocused,
    pendingOpenVersion: Number.increment,
    pendingCloseVersion: Number.increment,
  })

  if (model.isOpen) {
    return { model: dismissedModel, outMessage: OutMessage.Closed() }
  }

  return { model: dismissedModel }
}

/** Programmatically closes HoverIntent immediately, invalidating pending
 *  transitions and suppressing reopening until the trigger disengages. */
export const close = (model: Model): UpdateReturn =>
  dismiss(
    model,
    Option.exists(
      model.maybeFocusLocation,
      focusLocation => focusLocation === 'Trigger',
    ),
  )

/** Processes a HoverIntent Message and returns the next Model, optional Commands, and an optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    EnteredTrigger: () => entered(evo(model, { isTriggerHovered: () => true })),
    LeftTrigger: () => left(evo(model, { isTriggerHovered: () => false })),
    EnteredPanel: () => entered(evo(model, { isPanelHovered: () => true })),
    LeftPanel: () => left(evo(model, { isPanelHovered: () => false })),
    FocusedTrigger: () => focused(model, 'Trigger'),
    BlurredTrigger: () => blurred(model),
    FocusedPanel: () => focused(model, 'Panel'),
    BlurredPanel: () => blurred(model),

    PressedEscape: ({ source }) => {
      const isTriggerFocused =
        source === 'Trigger' ||
        Option.exists(
          model.maybeFocusLocation,
          focusLocation => focusLocation === 'Trigger',
        )

      return dismiss(model, isTriggerFocused)
    },

    CompletedWaitBeforeOpening: ({ version }) => {
      if (version !== model.pendingOpenVersion) {
        return { model }
      }

      if (model.isDismissed || !isEngaged(model)) {
        return { model }
      }

      return open(model)
    },

    CompletedWaitBeforeClosing: ({ version }) => {
      if (version !== model.pendingCloseVersion || isEngaged(model)) {
        return { model }
      }

      return finishClosing(model)
    },
  })

// VIEW

/** Render-time payload published to the consumer's `toView`.
 *
 * - `trigger`: event attributes for the element that starts intent.
 * - `panel`: event attributes for the element that remains open while hovered or focused.
 * - `isVisible`: whether the consumer should render its panel. */
export type RenderInfo = Readonly<{
  trigger: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  /** Selector for the trigger to focus before Escape removes panel content. If it does not resolve to a focusable element, HoverIntent leaves fallback focus behavior to the browser. */
  focusTriggerSelector?: string
  toView: (render: RenderInfo) => Html
}>

/** Renders headless HoverIntent event bundles. It owns no markup, ARIA semantics, positioning, or styling. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, { focusTriggerSelector, toView }, h): Html => {
    const toPressedEscape =
      (source: 'Trigger' | 'Panel') =>
      (key: string): Option.Option<typeof Message.PressedEscape.Type> =>
        Match.value(key).pipe(
          Match.when('Escape', () =>
            Option.some(Message.PressedEscape({ source })),
          ),
          Match.orElse(() => Option.none()),
        )

    const panelEscapeHandler =
      focusTriggerSelector === undefined
        ? h.OnKeyDownPreventDefault(toPressedEscape('Panel'))
        : h.OnKeyDownFocus(key =>
            Match.value(key).pipe(
              Match.when('Escape', () =>
                Option.some({
                  focusSelector: focusTriggerSelector,
                  message: Message.PressedEscape({ source: 'Panel' }),
                }),
              ),
              Match.orElse(() => Option.none()),
            ),
          )

    return toView({
      trigger: childAttributes([
        h.OnMouseEnter(Message.EnteredTrigger()),
        h.OnMouseLeave(Message.LeftTrigger()),
        h.OnFocus(Message.FocusedTrigger()),
        h.OnBlur(Message.BlurredTrigger()),
        h.OnKeyDownPreventDefault(toPressedEscape('Trigger')),
      ]),
      panel: childAttributes([
        h.OnMouseEnter(Message.EnteredPanel()),
        h.OnMouseLeave(Message.LeftPanel()),
        h.OnFocusEnter(Message.FocusedPanel()),
        h.OnFocusLeave(Message.BlurredPanel()),
        panelEscapeHandler,
      ]),
      isVisible: model.isOpen,
    })
  },
)
