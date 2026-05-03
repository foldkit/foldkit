import {
  Duration,
  Effect,
  Equal,
  Match as M,
  Number,
  Option,
  Schema as S,
} from 'effect'

import * as Command from '../../command/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import {
  type Attribute,
  type Html,
  type MountResult,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { evo } from '../../struct/index.js'
import * as Task from '../../task/index.js'
import { anchorSetup } from '../anchor.js'
import type { AnchorConfig } from '../anchor.js'

// MODEL

/** Schema for the tooltip component's state. `isOpen` is visibility; `isHovered` tracks pointer on trigger; `isFocused` tracks tooltip-affirming focus on the trigger (focus arriving without a preceding mouse press — keyboard, touch, or pen; mouse-click-induced focus is excluded since it doesn't affirm the user wants the tooltip visible); `isDismissed` suppresses re-opening after the user dismissed the tooltip (via Escape or left-click) until they disengage (leave or blur). `showDelay` is the hover-to-show duration. `maybeLastPointerType` records the most recent pointer type that pressed the trigger, so a mouse-click-induced focus can be distinguished from other focus. */
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

/** Sent when the pointer enters the tooltip trigger. Starts the show-delay timer. */
export const EnteredTrigger = m('EnteredTrigger')
/** Sent when the pointer leaves the tooltip trigger. Cancels any pending show-delay and hides the tooltip unless focus is active. */
export const LeftTrigger = m('LeftTrigger')
/** Sent when focus enters the trigger. Shows the tooltip immediately unless the focus was caused by a mouse press, in which case the hover-delay path handles it instead. */
export const FocusedTrigger = m('FocusedTrigger')
/** Sent when focus leaves the trigger. Hides the tooltip unless hover is active. */
export const BlurredTrigger = m('BlurredTrigger')
/** Sent when Escape is pressed while the tooltip is visible. Hides the tooltip and flags `isDismissed` so hover and focus do not re-open it until the user disengages (leaves or blurs the trigger). */
export const PressedEscape = m('PressedEscape')
/** Sent when a pointer presses the trigger. Records the pointer type so a following focus event from the same mouse click can be suppressed, and a left-click on an open tooltip dismisses it (the user is clicking the button for its action, not to keep the tooltip visible). */
export const PressedPointerOnTrigger = m('PressedPointerOnTrigger', {
  pointerType: S.String,
  button: S.Number,
})
/** Sent when the show-delay timer fires. Carries a generation number that is compared against the current pending version to discard stale timers. */
export const ElapsedShowDelay = m('ElapsedShowDelay', {
  version: S.Number,
})
/** Signals that the show-delay has changed (e.g. in response to a user preference, input-method change, or reduced-motion setting). Does not affect the current open/closed state; the new delay applies to the next hover. Typically dispatched via the `setShowDelay` helper. */
export const ChangedShowDelay = m('ChangedShowDelay', {
  showDelay: S.DurationFromMillis,
})
/** Sent when the tooltip panel mounts and Floating UI has positioned it. Update no-ops; the side effect is the act of positioning, surfaced for DevTools observability. */
export const CompletedAnchorMount = m('CompletedAnchorMount')

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
    typeof ChangedShowDelay,
    typeof CompletedAnchorMount,
  ]
> = S.Union([
  EnteredTrigger,
  LeftTrigger,
  FocusedTrigger,
  BlurredTrigger,
  PressedEscape,
  PressedPointerOnTrigger,
  ElapsedShowDelay,
  ChangedShowDelay,
  CompletedAnchorMount,
])

export type EnteredTrigger = typeof EnteredTrigger.Type
export type LeftTrigger = typeof LeftTrigger.Type
export type FocusedTrigger = typeof FocusedTrigger.Type
export type BlurredTrigger = typeof BlurredTrigger.Type
export type PressedEscape = typeof PressedEscape.Type
export type PressedPointerOnTrigger = typeof PressedPointerOnTrigger.Type

export type Message = typeof Message.Type

// INIT

const DEFAULT_SHOW_DELAY = Duration.millis(500)

const LEFT_MOUSE_BUTTON = 0

/** Configuration for creating a tooltip model with `init`. `showDelay` controls how long the pointer must hover before the tooltip appears (default 500ms). Accepts any `Duration.Input` — a bare number is interpreted as milliseconds. Keyboard focus shows the tooltip immediately regardless of this value. */
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

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Waits for the tooltip's show delay before emitting `ElapsedShowDelay`. The version is echoed back so a stale timer is ignored when the user leaves before the delay fires. */
export const ShowAfterDelay = Command.define('ShowAfterDelay', ElapsedShowDelay)

/** The anchor-positioning Mount this Tooltip renders on its panel. Exposed so
 *  Scene tests can call `Scene.resolveMount(TooltipAnchor, CompletedAnchorMount())`
 *  to acknowledge the mount produced by the rendered panel. */
export const TooltipAnchor = Mount.define('TooltipAnchor', CompletedAnchorMount)

/** Processes a tooltip message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn =>
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
          [
            ShowAfterDelay(
              Task.delay(model.showDelay).pipe(
                Effect.as(ElapsedShowDelay({ version: nextVersion })),
              ),
            ),
          ],
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

      ChangedShowDelay: ({ showDelay }) => [
        evo(model, { showDelay: () => showDelay }),
        [],
      ],

      CompletedAnchorMount: () => [model, []],
    }),
  )

/** Programmatically updates the tooltip's hover show-delay. Use this in response to user preference changes, input-method switches, or reduced-motion settings. The new delay applies to the next hover; any pending timer is unaffected (its stale version will discard harmlessly when it fires). */
export const setShowDelay = (
  model: Model,
  showDelay: Duration.Input,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(
    model,
    ChangedShowDelay({ showDelay: Duration.fromInputUnsafe(showDelay) }),
  )

// VIEW

/** Configuration for rendering a tooltip with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toParentMessage: (
    message:
      | EnteredTrigger
      | LeftTrigger
      | FocusedTrigger
      | BlurredTrigger
      | PressedEscape
      | PressedPointerOnTrigger
      | typeof CompletedAnchorMount.Type,
  ) => Message
  anchor: AnchorConfig
  triggerContent: Html
  triggerClassName?: string
  triggerAttributes?: ReadonlyArray<Attribute<Message>>
  content: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<Message>>
  isDisabled?: boolean
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
}>

/** Renders a headless tooltip with an anchored non-interactive panel. Shows on hover (after delay) or focus (from keyboard, touch, or pen; mouse-click focus is excluded); hides on leave, blur, Escape, or left-click of the trigger. Uses `role="tooltip"` and links the trigger via `aria-describedby`. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    div,
    AriaDescribedBy,
    AriaDisabled,
    Class,
    DataAttribute,
    Id,
    OnBlur,
    OnFocus,
    OnKeyDownPreventDefault,
    OnMount,
    OnMouseEnter,
    OnMouseLeave,
    OnPointerDown,
    Role,
    Style,
    Type,
    keyed,
  } = html<Message>()

  const {
    model: { id, isOpen },
    toParentMessage,
    anchor,
    triggerContent,
    triggerClassName,
    triggerAttributes = [],
    content,
    panelClassName,
    panelAttributes = [],
    isDisabled,
    className,
    attributes = [],
  } = config

  const handleTriggerKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when('Escape', () =>
        OptionExt.when(isOpen, toParentMessage(PressedEscape())),
      ),
      M.orElse(() => Option.none()),
    )

  const handleTriggerPointerDown = (
    pointerType: string,
    button: number,
  ): Option.Option<Message> =>
    Option.some(
      toParentMessage(PressedPointerOnTrigger({ pointerType, button })),
    )

  const resolvedTriggerAttributes = [
    Id(`${id}-trigger`),
    Type('button'),
    AriaDescribedBy(`${id}-panel`),
    ...(isOpen ? [DataAttribute('open', '')] : []),
    ...(isDisabled
      ? [AriaDisabled(true), DataAttribute('disabled', '')]
      : [
          OnMouseEnter(toParentMessage(EnteredTrigger())),
          OnMouseLeave(toParentMessage(LeftTrigger())),
          OnFocus(toParentMessage(FocusedTrigger())),
          OnBlur(toParentMessage(BlurredTrigger())),
          OnKeyDownPreventDefault(handleTriggerKeyDown),
          OnPointerDown(handleTriggerPointerDown),
        ]),
    ...(triggerClassName ? [Class(triggerClassName)] : []),
    ...triggerAttributes,
  ]

  const anchorAction = Mount.mapMessage(
    TooltipAnchor(
      (items): Effect.Effect<MountResult<typeof CompletedAnchorMount.Type>> =>
        Effect.sync(() => ({
          message: CompletedAnchorMount(),
          cleanup: anchorSetup({
            buttonId: `${id}-trigger`,
            anchor,
            interceptTab: false,
          })(items),
        })),
    ),
    toParentMessage,
  )

  const anchorAttributes = [
    Style({
      position: 'absolute',
      margin: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
    }),
    OnMount(anchorAction),
  ]

  const resolvedPanelAttributes = [
    Id(`${id}-panel`),
    Role('tooltip'),
    ...anchorAttributes,
    ...(isOpen ? [DataAttribute('open', '')] : []),
    ...(panelClassName ? [Class(panelClassName)] : []),
    ...panelAttributes,
  ]

  const wrapperAttributes = [
    ...(className ? [Class(className)] : []),
    ...attributes,
  ]

  return div(wrapperAttributes, [
    keyed('button')(`${id}-trigger`, resolvedTriggerAttributes, [
      triggerContent,
    ]),
    ...(isOpen
      ? [keyed('div')(`${id}-panel`, resolvedPanelAttributes, [content])]
      : []),
  ])
}

/** Creates a memoized tooltip view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<ViewConfig<Message>, 'model' | 'toParentMessage'>,
): ((
  model: Model,
  toParentMessage: ViewConfig<Message>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}
