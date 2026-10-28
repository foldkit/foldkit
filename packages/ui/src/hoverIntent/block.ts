import {
  Array,
  Duration,
  Effect,
  Equal,
  Layer,
  Match,
  Number,
  Option,
  Schema,
} from 'effect'
import * as Block from 'foldkit/block'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { InMessage, Message, OutMessage } from './message.js'

// MODEL

/** Schema for the trigger an interaction comes from: the unkeyed `trigger` bundle, or a `keyedTrigger(key)` bundle. */
export const Trigger = defineTaggedUnion({
  Unkeyed: {},
  Keyed: { key: Schema.String },
})
/** The trigger an interaction comes from. */
export type Trigger = typeof Trigger.Type

/** Schema for a trigger that has the pointer or focus. `isDismissed` records that Escape dismissed the panel for it. */
export const TriggerEngagement = Schema.Struct({
  trigger: Trigger,
  isDismissed: Schema.Boolean,
})
/** A trigger that has the pointer or focus. */
export type TriggerEngagement = typeof TriggerEngagement.Type

/** Schema for the panel having the pointer or focus. `isDismissed` records that the panel was engaged while Escape dismissed it for the active trigger. */
export const PanelEngagement = Schema.Struct({ isDismissed: Schema.Boolean })
/** The panel having the pointer or focus. */
export type PanelEngagement = typeof PanelEngagement.Type

/** Schema for the element that holds focus: one trigger, or the panel, each recorded with its engagement fields. */
export const FocusLocation = defineTaggedUnion({
  Trigger: TriggerEngagement.fields,
  Panel: PanelEngagement.fields,
})
/** The element that holds focus. */
export type FocusLocation = typeof FocusLocation.Type

/** Schema for HoverIntent state. It tracks which trigger the panel belongs to, which trigger and whether the panel has the pointer, where focus is, visibility, and delay timers. Escape dismissal is recorded on those pointer and focus records, so it ends once the dismissed trigger, and the panel while it belongs to that trigger, have lost both the pointer and focus. `activeTrigger` keeps the trigger that most recently took the panel after the panel closes. */
export const Model = Schema.Struct({
  isOpen: Schema.Boolean,
  activeTrigger: Trigger,
  maybeHoveredTrigger: Schema.Option(TriggerEngagement),
  maybeHoveredPanel: Schema.Option(PanelEngagement),
  maybeFocusLocation: Schema.Option(FocusLocation),
  openDelay: Schema.DurationFromMillis,
  closeDelay: Schema.DurationFromMillis,
  pendingOpenVersion: Schema.Number,
  pendingCloseVersion: Schema.Number,
})
export type Model = typeof Model.Type

/** @internal Stable identity of the HoverIntent contract. */
export const HoverIntentKey = Symbol('HoverIntent')
export const HoverIntentBlock = Block.make('HoverIntent', {
  key: HoverIntentKey,
  Model,
  Message,
  OutMessage,
  InitArgs: Block.makeInputContract<readonly [config?: InitConfig]>(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  InMessage,
  inMessageOutputs: {
    RequestedClose: {
      outMessage: OutMessage.Closed,
    },
    InformedOfRemovedKeyedTrigger: {
      outMessage: OutMessage.Closed,
    },
  },
})

/** Public HoverIntent authoring contract and passive graph identity. */
export type HoverIntentBlock = typeof HoverIntentBlock

const HoverIntentComposition = HoverIntentBlock.makeComposition()

const DEFAULT_OPEN_DELAY = Duration.millis(200)
const DEFAULT_CLOSE_DELAY = Duration.millis(300)

/** Configuration for creating a HoverIntent Model. */
export type InitConfig = Readonly<{
  openDelay?: Duration.Input
  closeDelay?: Duration.Input
}>

/** Creates the initial HoverIntent Model and Commands. Pointer entry opens after 200 milliseconds and pointer departure closes after a 300-millisecond grace period by default. Focus entry opens immediately, and focus departure closes without that pointer grace period. */
export const init = HoverIntentComposition.makeInit(
  (config: InitConfig = {}) => ({
    model: {
      isOpen: false,
      activeTrigger: Trigger.Unkeyed(),
      maybeHoveredTrigger: Option.none(),
      maybeHoveredPanel: Option.none(),
      maybeFocusLocation: Option.none(),
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
    },
  }),
)

// COMMAND

/** Waits before opening, then emits the version that scheduled the wait. */
export const WaitBeforeOpening = HoverIntentBlock.makeCommand(
  'WaitBeforeOpening',
  {
    args: { delay: Schema.DurationFromMillis, version: Schema.Number },
    messages: [Message.CompletedWaitBeforeOpening],
    handler: function* () {
      return ({ delay, version }) =>
        Effect.sleep(delay).pipe(
          Effect.as(Message.CompletedWaitBeforeOpening({ version })),
        )
    },
  },
)

/** Waits before closing, then emits the version that scheduled the wait. */
export const WaitBeforeClosing = HoverIntentBlock.makeCommand(
  'WaitBeforeClosing',
  {
    args: { delay: Schema.DurationFromMillis, version: Schema.Number },
    messages: [Message.CompletedWaitBeforeClosing],
    handler: function* () {
      return ({ delay, version }) =>
        Effect.sleep(delay).pipe(
          Effect.as(Message.CompletedWaitBeforeClosing({ version })),
        )
    },
  },
)

/** Effect providers used by the HoverIntent component. */
export const EffectsLayer = Layer.mergeAll(
  WaitBeforeOpening.layer,
  WaitBeforeClosing.layer,
)

const toMaybeFocusedTrigger = (
  model: Model,
): Option.Option<TriggerEngagement> =>
  Option.flatMap(
    model.maybeFocusLocation,
    FocusLocation.match<Option.Option<TriggerEngagement>>({
      Trigger: ({ trigger, isDismissed }) =>
        Option.some({ trigger, isDismissed }),
      Panel: () => Option.none(),
    }),
  )

const toMaybeFocusedPanel = (model: Model): Option.Option<PanelEngagement> =>
  Option.flatMap(
    model.maybeFocusLocation,
    FocusLocation.match<Option.Option<PanelEngagement>>({
      Trigger: () => Option.none(),
      Panel: ({ isDismissed }) => Option.some({ isDismissed }),
    }),
  )

const toTriggerEngagements = (model: Model): ReadonlyArray<TriggerEngagement> =>
  Array.getSomes([model.maybeHoveredTrigger, toMaybeFocusedTrigger(model)])

const toPanelEngagements = (model: Model): ReadonlyArray<PanelEngagement> =>
  Array.getSomes([model.maybeHoveredPanel, toMaybeFocusedPanel(model)])

const isEngagementOf =
  (trigger: Trigger) =>
  (engagement: TriggerEngagement): boolean =>
    Equal.equals(engagement.trigger, trigger)

const isTriggerHovered = (model: Model, trigger: Trigger): boolean =>
  Option.exists(model.maybeHoveredTrigger, isEngagementOf(trigger))

const isTriggerFocused = (model: Model, trigger: Trigger): boolean =>
  Option.exists(toMaybeFocusedTrigger(model), isEngagementOf(trigger))

const isTriggerEngaged = (model: Model, trigger: Trigger): boolean =>
  isTriggerHovered(model, trigger) || isTriggerFocused(model, trigger)

const isPanelEngaged = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(toPanelEngagements(model))

const isPanelDismissed = (model: Model): boolean =>
  Array.some(toPanelEngagements(model), ({ isDismissed }) => isDismissed)

const isTriggerDismissed = (model: Model, trigger: Trigger): boolean =>
  Array.some(
    toTriggerEngagements(model),
    engagement => engagement.isDismissed && isEngagementOf(trigger)(engagement),
  ) ||
  (Equal.equals(trigger, model.activeTrigger) && isPanelDismissed(model))

const isActiveTriggerDismissed = (model: Model): boolean =>
  isTriggerDismissed(model, model.activeTrigger)

const isActiveTriggerOrPanelEngaged = (model: Model): boolean =>
  isTriggerEngaged(model, model.activeTrigger) || isPanelEngaged(model)

const toMaybeHandBackTrigger = (model: Model): Option.Option<Trigger> =>
  Option.map(
    Array.findFirst(
      toTriggerEngagements(model),
      ({ trigger }) => !isTriggerDismissed(model, trigger),
    ),
    ({ trigger }) => trigger,
  )

const activateTrigger = (model: Model, trigger: Trigger): Model => {
  if (Equal.equals(model.activeTrigger, trigger)) {
    return model
  } else {
    return modifyFields(model, {
      activeTrigger: () => trigger,
      maybeHoveredPanel: Option.map(() => ({ isDismissed: false })),
      maybeFocusLocation: Option.map(
        FocusLocation.match<FocusLocation>({
          Trigger: focusedTrigger => focusedTrigger,
          Panel: () => FocusLocation.Panel({ isDismissed: false }),
        }),
      ),
    })
  }
}

const releasePanel = (model: Model): Model =>
  modifyFields(model, {
    maybeHoveredPanel: () => Option.none(),
    maybeFocusLocation: Option.filter(FocusLocation.guards.Trigger),
  })

const open = (model: Model) => {
  if (model.isOpen) {
    return { model }
  }

  return {
    model: modifyFields(model, { isOpen: () => true }),
    outMessage: OutMessage.Opened(),
  }
}

const finishClosing = (model: Model) => {
  if (!model.isOpen) {
    return { model }
  }

  return {
    model: modifyFields(model, { isOpen: () => false }),
    outMessage: OutMessage.Closed(),
  }
}

const handBackOrClose = (model: Model) =>
  Option.match(toMaybeHandBackTrigger(model), {
    onNone: () => finishClosing(releasePanel(model)),
    onSome: handBackTrigger => ({
      model: activateTrigger(model, handBackTrigger),
    }),
  })

const scheduleOpen = HoverIntentBlock.makeStep(model => {
  const version = Number.increment(model.pendingOpenVersion)
  return {
    model: modifyFields(model, { pendingOpenVersion: () => version }),
    commands: [WaitBeforeOpening({ delay: model.openDelay, version })],
  }
})

const scheduleClose = (delay: Duration.Duration) =>
  HoverIntentBlock.makeStep(model => {
    const version = Number.increment(model.pendingCloseVersion)
    return {
      model: modifyFields(model, { pendingCloseVersion: () => version }),
      commands: [WaitBeforeClosing({ delay, version })],
    }
  })

const entered = (model: Model) => {
  const enteredModel = modifyFields(model, {
    pendingCloseVersion: Number.increment,
  })

  if (enteredModel.isOpen || isActiveTriggerDismissed(enteredModel)) {
    return { model: enteredModel }
  }

  return scheduleOpen(enteredModel)
}

const left = (model: Model) => {
  const leftModel = modifyFields(model, {
    pendingOpenVersion: Number.increment,
  })

  if (isActiveTriggerOrPanelEngaged(leftModel) || !leftModel.isOpen) {
    return { model: leftModel }
  }

  return scheduleClose(leftModel.closeDelay)(leftModel)
}

const focused = (model: Model, focusLocation: FocusLocation) => {
  const focusedModel = modifyFields(model, {
    maybeFocusLocation: () => Option.some(focusLocation),
    pendingOpenVersion: Number.increment,
    pendingCloseVersion: Number.increment,
  })

  if (!focusedModel.isOpen && isActiveTriggerDismissed(focusedModel)) {
    return { model: focusedModel }
  }

  return open(focusedModel)
}

const blurred = (model: Model) => {
  const blurredModel = modifyFields(model, {
    pendingOpenVersion: Number.increment,
  })

  if (isActiveTriggerOrPanelEngaged(blurredModel) || !blurredModel.isOpen) {
    return { model: blurredModel }
  }

  return scheduleClose(Duration.zero)(blurredModel)
}

const enteredTrigger = (model: Model, trigger: Trigger) => {
  const isDismissed = isTriggerDismissed(model, trigger)
  const hoveredModel = modifyFields(model, {
    maybeHoveredTrigger: () => Option.some({ trigger, isDismissed }),
  })

  if (isDismissed) {
    return { model: hoveredModel }
  }

  return entered(activateTrigger(hoveredModel, trigger))
}

const leftTrigger = (model: Model, trigger: Trigger) => {
  const leftModel = modifyFields(model, {
    maybeHoveredTrigger: Option.filter(
      hoveredTrigger => !isEngagementOf(trigger)(hoveredTrigger),
    ),
  })

  if (Equal.equals(leftModel.activeTrigger, trigger)) {
    return left(leftModel)
  } else {
    return { model: leftModel }
  }
}

const focusedTrigger = (model: Model, trigger: Trigger) => {
  const isDismissed = isTriggerDismissed(model, trigger)
  const focusLocation = FocusLocation.Trigger({ trigger, isDismissed })

  if (isDismissed) {
    return {
      model: modifyFields(model, {
        maybeFocusLocation: () => Option.some(focusLocation),
      }),
    }
  }

  return focused(activateTrigger(model, trigger), focusLocation)
}

const blurredTrigger = (model: Model, trigger: Trigger) => {
  if (Equal.equals(model.activeTrigger, trigger)) {
    return blurred(
      modifyFields(model, {
        maybeFocusLocation: Option.filter(
          FocusLocation.match<boolean>({
            Trigger: focusedTrigger => !isEngagementOf(trigger)(focusedTrigger),
            Panel: () => false,
          }),
        ),
      }),
    )
  } else {
    return {
      model: modifyFields(model, {
        maybeFocusLocation: Option.filter(
          FocusLocation.match<boolean>({
            Trigger: focusedTrigger => !isEngagementOf(trigger)(focusedTrigger),
            Panel: () => true,
          }),
        ),
      }),
    }
  }
}

const enteredPanel = (model: Model) =>
  entered(
    modifyFields(model, {
      maybeHoveredPanel: () =>
        Option.some({ isDismissed: isActiveTriggerDismissed(model) }),
    }),
  )

const focusedPanel = (model: Model) =>
  focused(
    model,
    FocusLocation.Panel({ isDismissed: isActiveTriggerDismissed(model) }),
  )

const dismiss = (model: Model, dismissedTriggers: ReadonlyArray<Trigger>) => {
  const isDismissedBy = (engagement: TriggerEngagement): boolean =>
    Array.some(dismissedTriggers, dismissedTrigger =>
      isEngagementOf(dismissedTrigger)(engagement),
    )

  const dismissedModel = modifyFields(releasePanel(model), {
    isOpen: () => false,
    maybeHoveredTrigger: Option.map(hoveredTrigger =>
      modifyFields(hoveredTrigger, {
        isDismissed: isDismissed =>
          isDismissed || isDismissedBy(hoveredTrigger),
      }),
    ),
    maybeFocusLocation: Option.map(
      FocusLocation.match<FocusLocation>({
        Trigger: focusedTrigger =>
          modifyFields(focusedTrigger, {
            isDismissed: isDismissed =>
              isDismissed || isDismissedBy(focusedTrigger),
          }),
        Panel: focusedPanel => focusedPanel,
      }),
    ),
    pendingOpenVersion: Number.increment,
    pendingCloseVersion: Number.increment,
  })

  if (model.isOpen) {
    return { model: dismissedModel, outMessage: OutMessage.Closed() }
  }

  return { model: dismissedModel }
}

const pressedEscapeOnTrigger = (model: Model, trigger: Trigger) =>
  dismiss(
    modifyFields(model, {
      activeTrigger: () => trigger,
      maybeFocusLocation: () =>
        Option.some(FocusLocation.Trigger({ trigger, isDismissed: false })),
    }),
    model.isOpen ? [trigger, model.activeTrigger] : [trigger],
  )

const removedTrigger = (model: Model, trigger: Trigger) => {
  const releasedModel = modifyFields(model, {
    maybeHoveredTrigger: Option.filter(
      hoveredTrigger => !isEngagementOf(trigger)(hoveredTrigger),
    ),
    maybeFocusLocation: Option.filter(
      FocusLocation.match<boolean>({
        Trigger: focusedTrigger => !isEngagementOf(trigger)(focusedTrigger),
        Panel: () => true,
      }),
    ),
  })

  if (!Equal.equals(releasedModel.activeTrigger, trigger)) {
    return { model: releasedModel }
  }

  return handBackOrClose(
    modifyFields(releasedModel, {
      pendingOpenVersion: Number.increment,
      pendingCloseVersion: Number.increment,
    }),
  )
}

/** Processes parent requests and notifications without routing them through local Messages. */
export const inMessageUpdate = HoverIntentComposition.makeInMessageUpdate({
  RequestedClose: HoverIntentBlock.makeStep(model =>
    dismiss(model, [model.activeTrigger]),
  ),
  InformedOfRemovedKeyedTrigger: (model, { key }) =>
    removedTrigger(model, Trigger.Keyed({ key })),
})

/** Processes a HoverIntent Message and returns the next Model, optional Commands, and an optional OutMessage. */
export const update = HoverIntentComposition.makeUpdate({
  EnteredTrigger: model => enteredTrigger(model, Trigger.Unkeyed()),
  LeftTrigger: model => leftTrigger(model, Trigger.Unkeyed()),
  EnteredPanel: model => enteredPanel(model),
  LeftPanel: model =>
    left(modifyFields(model, { maybeHoveredPanel: () => Option.none() })),
  FocusedTrigger: model => focusedTrigger(model, Trigger.Unkeyed()),
  BlurredTrigger: model => blurredTrigger(model, Trigger.Unkeyed()),
  EnteredKeyedTrigger: (model, { key }) =>
    enteredTrigger(model, Trigger.Keyed({ key })),
  LeftKeyedTrigger: (model, { key }) =>
    leftTrigger(model, Trigger.Keyed({ key })),
  FocusedKeyedTrigger: (model, { key }) =>
    focusedTrigger(model, Trigger.Keyed({ key })),
  BlurredKeyedTrigger: (model, { key }) =>
    blurredTrigger(model, Trigger.Keyed({ key })),
  FocusedPanel: model => focusedPanel(model),
  BlurredPanel: model =>
    blurred(modifyFields(model, { maybeFocusLocation: () => Option.none() })),
  PressedEscape: (model, { source }) => {
    if (source === 'Trigger') {
      return pressedEscapeOnTrigger(model, Trigger.Unkeyed())
    } else {
      return dismiss(model, [model.activeTrigger])
    }
  },
  PressedEscapeOnKeyedTrigger: (model, { key }) =>
    pressedEscapeOnTrigger(model, Trigger.Keyed({ key })),
  CompletedWaitBeforeOpening: (model, { version }) => {
    if (
      version !== model.pendingOpenVersion ||
      isActiveTriggerDismissed(model) ||
      !isActiveTriggerOrPanelEngaged(model)
    ) {
      return { model }
    }
    return open(model)
  },
  CompletedWaitBeforeClosing: (model, { version }) => {
    if (
      version !== model.pendingCloseVersion ||
      isActiveTriggerOrPanelEngaged(model)
    ) {
      return { model }
    }
    return handBackOrClose(model)
  },
})

// VIEW

/** Render-time payload published to the consumer's `toView`.
 *
 * - `trigger`: event attributes for the element that starts intent.
 * - `keyedTrigger`: event attributes for one of many triggers that share the panel, identified by `key`.
 * - `maybeActiveTriggerKey`: the key of the keyed trigger the panel belongs to. It is `None` before any keyed trigger engages the panel and while the unkeyed trigger holds it. It keeps the key after the panel closes, so check `isVisible` before rendering the panel.
 * - `panel`: event attributes for the element that remains open while hovered or focused.
 * - `isVisible`: whether the consumer should render its panel. */
export type RenderInfo = Readonly<{
  trigger: ReadonlyArray<ChildAttribute>
  keyedTrigger: (key: string) => ReadonlyArray<ChildAttribute>
  maybeActiveTriggerKey: Option.Option<string>
  panel: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  /** Selector for the trigger to focus before Escape removes panel content. If it does not resolve to a focusable element, HoverIntent leaves fallback focus behavior to the browser. */
  focusTriggerSelector?: string
  toView: (render: RenderInfo) => Html
}>

/** Renders headless HoverIntent event bundles. It owns no markup, ARIA semantics, positioning, or styling. */
export const view = HoverIntentComposition.makeView.withInputs(
  (model, { focusTriggerSelector, toView }, h) => {
    const toEscapeMessage =
      <EscapeMessage>(message: EscapeMessage) =>
      (key: string): Option.Option<EscapeMessage> =>
        Match.value(key).pipe(
          Match.when('Escape', () => Option.some(message)),
          Match.orElse(() => Option.none()),
        )

    const toPressedEscape = (source: 'Trigger' | 'Panel') =>
      toEscapeMessage(Message.PressedEscape({ source }))

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
      keyedTrigger: key =>
        childAttributes([
          h.OnMouseEnter(Message.EnteredKeyedTrigger({ key })),
          h.OnMouseLeave(Message.LeftKeyedTrigger({ key })),
          h.OnFocus(Message.FocusedKeyedTrigger({ key })),
          h.OnBlur(Message.BlurredKeyedTrigger({ key })),
          h.OnKeyDownPreventDefault(
            toEscapeMessage(Message.PressedEscapeOnKeyedTrigger({ key })),
          ),
        ]),
      maybeActiveTriggerKey: Trigger.match(model.activeTrigger, {
        Unkeyed: () => Option.none(),
        Keyed: ({ key }) => Option.some(key),
      }),
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

/** Constructs the HoverIntent implementation without starting occurrence effects. */
export const layer = HoverIntentBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
})

/** @internal Selected implementation used by component tests. */
export const block = { block: HoverIntentBlock, layer }
