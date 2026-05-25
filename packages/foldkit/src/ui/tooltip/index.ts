import {
  Duration,
  Effect,
  Equal,
  Function,
  Match as M,
  Number,
  Option,
  Schema as S,
} from 'effect'

import * as Command from '../../command/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { evo } from '../../struct/index.js'
import type { Reflect } from '../../submodel/submodel.js'
import { AnchorConfig, anchorSetup } from '../anchor.js'

// MODEL

/** Schema for the tooltip component's state. `isOpen` is visibility; `isHovered` tracks pointer on trigger; `isFocused` tracks tooltip-affirming focus on the trigger (focus arriving without a preceding mouse press, like keyboard, touch, or pen; mouse-click-induced focus is excluded since it doesn't affirm the user wants the tooltip visible); `isDismissed` suppresses re-opening after the user dismissed the tooltip (via Escape or left-click) until they disengage (leave or blur). `showDelay` is the hover-to-show duration. `maybeLastPointerType` records the most recent pointer type that pressed the trigger, so a mouse-click-induced focus can be distinguished from other focus. */
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

// MESSAGE

/** Sent when the pointer enters the tooltip trigger. */
export const EnteredTrigger = m('EnteredTrigger')
/** Sent when the pointer leaves the tooltip trigger. */
export const LeftTrigger = m('LeftTrigger')
/** Sent when focus enters the trigger. */
export const FocusedTrigger = m('FocusedTrigger')
/** Sent when focus leaves the trigger. */
export const BlurredTrigger = m('BlurredTrigger')
/** Sent when Escape is pressed while the tooltip is visible. */
export const PressedEscape = m('PressedEscape')
/** Sent when a pointer presses the trigger. */
export const PressedPointerOnTrigger = m('PressedPointerOnTrigger', {
  pointerType: S.String,
  button: S.Number,
})
/** Sent when the show-delay timer fires. */
export const ElapsedShowDelay = m('ElapsedShowDelay', {
  version: S.Number,
})
/** Sent when the tooltip panel mounts and Floating UI has positioned it. */
export const CompletedAnchorTooltip = m('CompletedAnchorTooltip')

/** Union of all messages the tooltip component can produce. */
export const Message: S.Union<
  [
    typeof EnteredTrigger,
    typeof LeftTrigger,
    typeof FocusedTrigger,
    typeof BlurredTrigger,
    typeof PressedEscape,
    typeof PressedPointerOnTrigger,
    typeof ElapsedShowDelay,
    typeof CompletedAnchorTooltip,
  ]
> = S.Union([
  EnteredTrigger,
  LeftTrigger,
  FocusedTrigger,
  BlurredTrigger,
  PressedEscape,
  PressedPointerOnTrigger,
  ElapsedShowDelay,
  CompletedAnchorTooltip,
])

export type EnteredTrigger = typeof EnteredTrigger.Type
export type LeftTrigger = typeof LeftTrigger.Type
export type FocusedTrigger = typeof FocusedTrigger.Type
export type BlurredTrigger = typeof BlurredTrigger.Type
export type PressedEscape = typeof PressedEscape.Type
export type PressedPointerOnTrigger = typeof PressedPointerOnTrigger.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Emitted once the tooltip transitions to visible (`isOpen` becomes true).
 *  Consumers typically use this for analytics, instrumentation, or to
 *  coordinate with other transient UI. */
export const Shown = m('Shown')

/** Emitted once the tooltip transitions to hidden (`isOpen` becomes false). */
export const Hidden = m('Hidden')

/** Union of out-messages the tooltip component can produce. */
export const OutMessage = S.Union([Shown, Hidden])

export type Shown = typeof Shown.Type
export type Hidden = typeof Hidden.Type
export type OutMessage = typeof OutMessage.Type

// INIT

const DEFAULT_SHOW_DELAY = Duration.millis(500)

const LEFT_MOUSE_BUTTON = 0

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

type InnerUpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<InnerUpdateReturn>()

/** Waits for the tooltip's show delay before emitting `ElapsedShowDelay`. */
export const ShowAfterDelay = Command.define(
  'ShowAfterDelay',
  { delay: S.DurationFromMillis, version: S.Number },
  ElapsedShowDelay,
)(({ delay, version }) =>
  Effect.sleep(delay).pipe(Effect.as(ElapsedShowDelay({ version }))),
)

/** The anchor-positioning Mount this Tooltip renders on its panel. */
export const AnchorTooltip = Mount.define(
  'AnchorTooltip',
  { buttonId: S.String, anchor: AnchorConfig },
  CompletedAnchorTooltip,
)(
  ({ buttonId, anchor }) =>
    element =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            anchorSetup({
              buttonId,
              anchor,
              interceptTab: false,
            })(element),
          ),
          cleanup => Effect.sync(cleanup),
        )
        return CompletedAnchorTooltip()
      }),
)

const computeUpdate = (model: Model, message: Message): InnerUpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      EnteredTrigger: () => {
        if (model.isOpen || model.isDismissed) {
          return [evo(model, { isHovered: () => true }), []]
        }

        const nextVersion = Number.increment(model.pendingShowVersion)
        return [
          evo(model, {
            isHovered: () => true,
            pendingShowVersion: () => nextVersion,
          }),
          [ShowAfterDelay({ delay: model.showDelay, version: nextVersion })],
        ]
      },

      LeftTrigger: () => [
        evo(model, {
          isHovered: () => false,
          isOpen: () => model.isFocused && model.isOpen,
          isDismissed: () => false,
          pendingShowVersion: Number.increment,
        }),
        [],
      ],

      FocusedTrigger: () => {
        const isFromMousePress = Option.exists(
          model.maybeLastPointerType,
          Equal.equals('mouse'),
        )

        if (isFromMousePress) {
          return [
            evo(model, {
              maybeLastPointerType: () => Option.none(),
            }),
            [],
          ]
        }

        if (model.isDismissed) {
          return [
            evo(model, {
              isFocused: () => true,
              maybeLastPointerType: () => Option.none(),
            }),
            [],
          ]
        }

        return [
          evo(model, {
            isFocused: () => true,
            isOpen: () => true,
            pendingShowVersion: Number.increment,
          }),
          [],
        ]
      },

      BlurredTrigger: () => [
        evo(model, {
          isFocused: () => false,
          isOpen: () => model.isHovered && model.isOpen,
          isDismissed: () => false,
          pendingShowVersion: Number.increment,
          maybeLastPointerType: () => Option.none(),
        }),
        [],
      ],

      PressedEscape: () => [
        evo(model, {
          isOpen: () => false,
          isDismissed: () => true,
          pendingShowVersion: Number.increment,
        }),
        [],
      ],

      PressedPointerOnTrigger: ({ pointerType, button }) => {
        const isLeftClickOnOpen = button === LEFT_MOUSE_BUTTON && model.isOpen

        if (isLeftClickOnOpen) {
          return [
            evo(model, {
              maybeLastPointerType: () => Option.some(pointerType),
              isOpen: () => false,
              isFocused: () => false,
              isDismissed: () => true,
              pendingShowVersion: Number.increment,
            }),
            [],
          ]
        }

        return [
          evo(model, {
            maybeLastPointerType: () => Option.some(pointerType),
          }),
          [],
        ]
      },

      ElapsedShowDelay: ({ version }) => {
        if (version !== model.pendingShowVersion) {
          return [model, []]
        }

        if (!model.isHovered) {
          return [model, []]
        }

        return [evo(model, { isOpen: () => true }), []]
      },

      CompletedAnchorTooltip: () => [model, []],
    }),
  )

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

/** Processes a tooltip message and returns the next model, commands, and
 *  an optional OutMessage. `Shown`/`Hidden` fire only on `isOpen`
 *  transitions, so consumers don't get spurious events for messages that
 *  only update hover/focus/delay state without changing visibility. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const [nextModel, commands] = computeUpdate(model, message)
  const maybeOutMessage: Option.Option<OutMessage> =
    !model.isOpen && nextModel.isOpen
      ? Option.some(Shown())
      : model.isOpen && !nextModel.isOpen
        ? Option.some(Hidden())
        : Option.none()
  return [nextModel, commands, maybeOutMessage]
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
}>

/** Renders a headless tooltip with an anchored non-interactive panel.
 *  Shows on hover (after delay) or focus (from keyboard, touch, or pen;
 *  mouse-click focus is excluded); hides on leave, blur, Escape, or
 *  left-click of the trigger. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, isOpen } = model
    const { anchor, toView, isDisabled } = viewInputs

    const handleTriggerKeyDown = (key: string): Option.Option<PressedEscape> =>
      M.value(key).pipe(
        M.when('Escape', () => OptionExt.when(isOpen, PressedEscape())),
        M.orElse(() => Option.none()),
      )

    const handleTriggerPointerDown = (
      pointerType: string,
      button: number,
    ): Option.Option<PressedPointerOnTrigger> =>
      Option.some(PressedPointerOnTrigger({ pointerType, button }))

    const triggerAttributes = [
      h.Id(`${id}-trigger`),
      h.Type('button'),
      h.AriaDescribedBy(`${id}-panel`),
      ...(isOpen ? [h.DataAttribute('open', '')] : []),
      ...(isDisabled
        ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
        : [
            h.OnMouseEnter(EnteredTrigger()),
            h.OnMouseLeave(LeftTrigger()),
            h.OnFocus(FocusedTrigger()),
            h.OnBlur(BlurredTrigger()),
            h.OnKeyDownPreventDefault(handleTriggerKeyDown),
            h.OnPointerDown(handleTriggerPointerDown),
          ]),
    ]

    const panelAttributes = [
      h.Id(`${id}-panel`),
      h.Role('tooltip'),
      h.Style({
        position: 'absolute',
        margin: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
      }),
      h.OnMount(AnchorTooltip({ buttonId: `${id}-trigger`, anchor })),
      ...(isOpen ? [h.DataAttribute('open', '')] : []),
    ]

    return toView({
      trigger: childAttributes(triggerAttributes),
      panel: childAttributes(panelAttributes),
      isVisible: isOpen,
    })
  },
)
