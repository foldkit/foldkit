import { Effect, Function, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type { Reflect } from '../../submodel/submodel.js'

// MODEL

/** Schema for the disclosure component's state, tracking its unique ID and open/closed status. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the disclosure button is clicked. Toggles the open/closed state. */
export const Toggled = m('Toggled')
/** Sent to explicitly close the disclosure, regardless of its current state. */
export const Closed = m('Closed')
/** Sent when the focus-button command completes after closing. */
export const CompletedFocusButton = m('CompletedFocusButton')

/** Union of all messages the disclosure component can produce. */
export const Message: S.Union<
  [typeof Toggled, typeof Closed, typeof CompletedFocusButton]
> = S.Union([Toggled, Closed, CompletedFocusButton])

export type Toggled = typeof Toggled.Type
export type Closed = typeof Closed.Type
export type CompletedFocusButton = typeof CompletedFocusButton.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent each time the disclosure toggles. The new open state is available on the next model snapshot; this OutMessage signals only that the transition happened. Consumers typically use this for analytics, lazy content loading, or saving open/closed state to a store. */
export const ToggledOpenState = m('ToggledOpenState', { isOpen: S.Boolean })

export const OutMessage = S.Union([ToggledOpenState])
export type OutMessage = typeof OutMessage.Type

export type ToggledOpenState = typeof ToggledOpenState.Type

// INIT

/** Configuration for creating a disclosure model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isOpen?: boolean
}>

/** Creates an initial disclosure model from a config. Defaults to closed. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: config.isOpen ?? false,
})

// UPDATE

const buttonId = (id: string): string => `${id}-button`

const buttonSelector = (id: string): string => `#${CSS.escape(buttonId(id))}`

const panelId = (id: string): string => `${id}-panel`

/** Moves focus to the disclosure's toggle button. */
export const FocusButton = Command.define(
  'FocusButton',
  { id: S.String },
  CompletedFocusButton,
)(({ id }) =>
  Dom.focus(buttonSelector(id)).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusButton()),
  ),
)

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Processes a disclosure message and returns the next model, commands, and optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Toggled: () => {
        const nextIsOpen = !model.isOpen
        const maybeFocus = Option.liftPredicate(
          FocusButton({ id: model.id }),
          () => model.isOpen,
        )

        return [
          evo(model, { isOpen: () => nextIsOpen }),
          Option.toArray(maybeFocus),
          Option.some(ToggledOpenState({ isOpen: nextIsOpen })),
        ]
      },
      Closed: () => {
        if (!model.isOpen) {
          return [model, [], Option.none()]
        }
        const maybeFocus = Option.liftPredicate(
          FocusButton({ id: model.id }),
          () => model.isOpen,
        )

        return [
          evo(model, { isOpen: () => false }),
          Option.toArray(maybeFocus),
          Option.some(ToggledOpenState({ isOpen: false })),
        ]
      },
      CompletedFocusButton: () => [model, [], Option.none()],
    }),
  )

/** Programmatically toggles the disclosure, updating the model and returning
 *  focus commands plus a `ToggledOpenState` OutMessage. */
export const toggle = (model: Model): UpdateReturn => update(model, Toggled())

/** Programmatically closes the disclosure, updating the model and returning
 *  focus commands plus a `ToggledOpenState` OutMessage when it was open. */
export const close = (model: Model): UpdateReturn => update(model, Closed())

/** Reflects an externally-sourced open state onto the model without
 *  emitting an OutMessage or running the focus command. Use this to mirror
 *  external truth (restored storage, a deep link) onto the disclosure.
 *  Contrast with `toggle`/`close`, which represent user or programmatic
 *  *choices* and emit `ToggledOpenState`. Returns the model directly
 *  because it produces no commands and no OutMessage. */
export const reflectOpenState: Reflect<Model, boolean> = Function.dual(
  2,
  (model: Model, isOpen: boolean): Model =>
    evo(model, { isOpen: () => isOpen }),
)

// VIEW

/** Attribute groups the disclosure component provides to the consumer's
 *  `toView` callback. The consumer composes the button + panel layout
 *  themselves using these bundles. */
export type DisclosureAttributes = Readonly<{
  button: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *
 *  - `toView`: receives the disclosure's `button` and `panel` attribute
 *    bundles and returns the composed layout. The consumer reads
 *    `isOpen` from their parent model when they need to render
 *    conditionally on it.
 *  - `isDisabled`: when true, the button is not clickable, gets
 *    `aria-disabled` and a `data-disabled` attribute. */
export type ViewInputs = Readonly<{
  toView: (attributes: DisclosureAttributes) => Html
  isDisabled?: boolean
}>

/** Renders a headless disclosure component with accessible ARIA
 *  attributes and keyboard support. The consumer composes the layout
 *  through the `toView` slot, spreading the published `button` and
 *  `panel` attribute bundles onto their own elements.
 *
 *  Designed to be embedded via `h.submodel`. The consumer reacts to
 *  toggle events by pattern-matching the `ToggledOpenState` OutMessage
 *  from the third element of `update`'s return tuple. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, isOpen } = model
    const { toView, isDisabled = false } = viewInputs

    const handleKeyDown = (key: string): Option.Option<Toggled> =>
      M.value(key).pipe(
        M.whenOr('Enter', ' ', () => Option.some(Toggled())),
        M.orElse(() => Option.none()),
      )

    const disabledAttributes = isDisabled
      ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
      : []

    const buttonAttributes = [
      h.Id(buttonId(id)),
      h.AriaExpanded(isOpen),
      h.AriaControls(panelId(id)),
      h.Tabindex(0),
      ...(isOpen ? [h.DataAttribute('open', '')] : []),
      ...disabledAttributes,
      ...(isDisabled
        ? []
        : [h.OnClick(Toggled()), h.OnKeyDownPreventDefault(handleKeyDown)]),
    ]

    const panelAttributes = [
      h.Id(panelId(id)),
      ...(isOpen ? [h.DataAttribute('open', '')] : []),
    ]

    return toView({
      button: childAttributes(buttonAttributes),
      panel: childAttributes(panelAttributes),
    })
  },
)
