import {
  Duration,
  Effect,
  Equal,
  Function,
  Match as M,
  Number,
  Option,
  Predicate,
  Schema as S,
} from 'effect'
import { type Update } from 'foldkit'
import * as Command from 'foldkit/command'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import * as Mount from 'foldkit/mount'
import { evo } from 'foldkit/struct'
import { type Reflect, defineView } from 'foldkit/submodel'

import { AnchorConfig, anchorSetup } from '../anchor/index.js'
import * as OptionExt from '../internal/optionExtensions.js'
import { Message, OutMessage } from './message.js'

// MODEL

/** Schema for the tooltip component's state. `isOpen` is visibility; `isHovered` tracks pointer on trigger; `isFocused` tracks tooltip-affirming focus on the trigger (focus arriving without a preceding mouse press, like keyboard, touch, or pen; mouse-click-induced focus is excluded since it doesn't affirm the user wants the tooltip visible); `isDismissed` suppresses re-opening after the user dismissed the tooltip (via Escape) until they disengage (leave or blur). `showDelay` is the hover-to-show duration. `maybeLastPointerType` records the most recent pointer type that pressed the trigger, so a mouse-click-induced focus can be distinguished from other focus. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isHovered: S.Boolean,
  isFocused: S.Boolean,
  isDismissed: S.Boolean,
  showDelay: S.DurationFromMillis,
  pendingShowVersion: S.Number,
  maybeLastPointerType: S.Option(S.String),
})

export type Model = typeof Model.Type

// SELECTORS

/** Returns the bare DOM id of the tooltip trigger button, derived from the
 *  tooltip's base id. Use this to associate an external label with the
 *  trigger via a native `<label for={Tooltip.triggerId(id)}>` or an
 *  `aria-labelledby` reference. */
export const triggerId = (id: string): string => `${id}-trigger`

const panelId = (id: string): string => `${id}-panel`

// INIT

const DEFAULT_SHOW_DELAY = Duration.millis(500)

/** Configuration for creating a tooltip model with `init`. */
export type InitConfig = Readonly<{
  id: string
  showDelay?: Duration.Input
}>

/** Creates an initial tooltip model from a config. Defaults to hidden. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isHovered: false,
  isFocused: false,
  isDismissed: false,
  showDelay:
    config.showDelay === undefined
      ? DEFAULT_SHOW_DELAY
      : Duration.fromInputUnsafe(config.showDelay),
  pendingShowVersion: 0,
  maybeLastPointerType: Option.none(),
})

// UPDATE

type InnerUpdateReturn = Update.Return<Model, Message>

/** Waits for the tooltip's show delay before emitting
 *  `CompletedWaitBeforeShowing`. */
export const WaitBeforeShowing = Command.define('WaitBeforeShowing', {
  args: { delay: S.DurationFromMillis, version: S.Number },
  messages: [Message.CompletedWaitBeforeShowing],
  execute: ({ delay, version }) =>
    Effect.sleep(delay).pipe(
      Effect.as(Message.CompletedWaitBeforeShowing({ version })),
    ),
})

/** The anchor-positioning Mount this Tooltip renders on its panel. */
export const AnchorTooltip = Mount.define(
  'AnchorTooltip',
  { buttonId: S.String, anchor: AnchorConfig },
  Message.CompletedAnchorTooltip,
)(
  ({ buttonId, anchor }) =>
    element =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            anchorSetup(element, {
              buttonId,
              anchor,
              interceptTab: false,
            }),
          ),
          cleanup => Effect.sync(cleanup),
        )
        return Message.CompletedAnchorTooltip()
      }),
)

const computeUpdate = (model: Model, message: Message) =>
  Message.match<InnerUpdateReturn>(message, {
    EnteredTrigger: () => {
      if (model.isOpen || model.isDismissed) {
        return { model: evo(model, { isHovered: () => true }) }
      }

      const nextVersion = Number.increment(model.pendingShowVersion)
      return {
        model: evo(model, {
          isHovered: () => true,
          pendingShowVersion: () => nextVersion,
        }),
        commands: [
          WaitBeforeShowing({ delay: model.showDelay, version: nextVersion }),
        ],
      }
    },

    LeftTrigger: () => ({
      model: evo(model, {
        isHovered: () => false,
        isOpen: () => model.isFocused && model.isOpen,
        isDismissed: () => false,
        pendingShowVersion: Number.increment,
      }),
    }),

    FocusedTrigger: () => {
      const isFromMousePress = Option.exists(
        model.maybeLastPointerType,
        Equal.equals('mouse'),
      )

      if (isFromMousePress) {
        return {
          model: evo(model, {
            maybeLastPointerType: () => Option.none(),
          }),
        }
      }

      if (model.isDismissed) {
        return {
          model: evo(model, {
            isFocused: () => true,
            maybeLastPointerType: () => Option.none(),
          }),
        }
      }

      return {
        model: evo(model, {
          isFocused: () => true,
          isOpen: () => true,
          pendingShowVersion: Number.increment,
        }),
      }
    },

    BlurredTrigger: () => ({
      model: evo(model, {
        isFocused: () => false,
        isOpen: () => model.isHovered && model.isOpen,
        isDismissed: () => false,
        pendingShowVersion: Number.increment,
        maybeLastPointerType: () => Option.none(),
      }),
    }),

    PressedEscape: () => ({
      model: evo(model, {
        isOpen: () => false,
        isDismissed: () => true,
        pendingShowVersion: Number.increment,
      }),
    }),

    PressedPointerOnTrigger: ({ pointerType }) => ({
      model: evo(model, {
        maybeLastPointerType: () => Option.some(pointerType),
      }),
    }),

    CompletedWaitBeforeShowing: ({ version }) => {
      if (version !== model.pendingShowVersion) {
        return { model }
      }

      if (!model.isHovered) {
        return { model }
      }

      return { model: evo(model, { isOpen: () => true }) }
    },

    CompletedAnchorTooltip: () => ({ model }),
  })

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const toVisibilityOutMessage = (
  isOpen: boolean,
  isNextOpen: boolean,
): OutMessage | undefined => {
  if (!isOpen && isNextOpen) {
    return OutMessage.Shown()
  } else if (isOpen && !isNextOpen) {
    return OutMessage.Hidden()
  } else {
    return undefined
  }
}

/** Processes a tooltip message and returns the next model, commands, and
 *  an optional OutMessage. `Shown`/`Hidden` fire only on `isOpen`
 *  transitions, so consumers don't get spurious events for messages that
 *  only update hover/focus/delay state without changing visibility. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const computeUpdateResult = computeUpdate(model, message)
  const outMessage = toVisibilityOutMessage(
    model.isOpen,
    computeUpdateResult.model.isOpen,
  )
  if (outMessage === undefined) {
    return computeUpdateResult
  } else {
    return { ...computeUpdateResult, outMessage }
  }
}

/** Reflects an externally-sourced hover show-delay onto the model without
 *  emitting an OutMessage. Use to mirror an external config value (a user
 *  preference, a restored setting) onto the tooltip. */
export const reflectShowDelay: Reflect<Model, Duration.Input> = Function.dual(
  2,
  (model: Model, showDelay: Duration.Input): Model =>
    evo(model, { showDelay: () => Duration.fromInputUnsafe(showDelay) }),
)

// VIEW

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `trigger`: attribute bundle for the trigger element. Carries the
 *    hover/focus/keyboard handlers + ARIA `aria-describedby` linking to
 *    the panel.
 *  - `panel`: attribute bundle for the panel element. Carries the
 *    `role="tooltip"`, the anchor Mount that positions the panel via
 *    Floating UI, and a `data-open` attribute when visible.
 *  - `isVisible`: derived state. The consumer decides whether to render
 *    the panel conditionally on this. */
export type RenderInfo = Readonly<{
  trigger: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  anchor: AnchorConfig
  toView: (render: RenderInfo) => Html
  isDisabled?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
}>

/** Renders a headless tooltip with an anchored non-interactive panel.
 *  Shows on hover (after delay) or focus (from keyboard, touch, or pen;
 *  mouse-click focus is excluded). Hides on leave, blur, or Escape. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { id, isOpen } = model
    const { anchor, toView, isDisabled, ariaLabel, ariaLabelledBy } = viewInputs

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

    const handleTriggerKeyDown = (
      key: string,
    ): Option.Option<typeof Message.PressedEscape.Type> =>
      M.value(key).pipe(
        M.when('Escape', () => OptionExt.when(isOpen, Message.PressedEscape())),
        M.orElse(() => Option.none()),
      )

    const handleTriggerPointerDown = (
      pointerType: string,
    ): Option.Option<typeof Message.PressedPointerOnTrigger.Type> =>
      Option.some(Message.PressedPointerOnTrigger({ pointerType }))

    const triggerAttributes = [
      h.Id(triggerId(id)),
      h.Type('button'),
      h.AriaDescribedBy(panelId(id)),
      ...triggerLabelAttributes,
      ...(isOpen ? [h.DataAttribute('open', '')] : []),
      ...(isDisabled
        ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
        : [
            h.OnMouseEnter(Message.EnteredTrigger()),
            h.OnMouseLeave(Message.LeftTrigger()),
            h.OnFocus(Message.FocusedTrigger()),
            h.OnBlur(Message.BlurredTrigger()),
            h.OnKeyDownPreventDefault(handleTriggerKeyDown),
            h.OnPointerDown(handleTriggerPointerDown),
          ]),
    ]

    const panelAttributes = [
      h.Id(panelId(id)),
      h.Role('tooltip'),
      h.Style({
        position: 'absolute',
        margin: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
      }),
      h.OnMount(AnchorTooltip({ buttonId: triggerId(id), anchor })),
      ...(isOpen ? [h.DataAttribute('open', '')] : []),
    ]

    return toView({
      trigger: childAttributes(triggerAttributes),
      panel: childAttributes(panelAttributes),
      isVisible: isOpen,
    })
  },
)
