import { Function, Match as M, Option, Schema as S } from 'effect'
import type { Command } from 'foldkit/command'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  html,
} from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import { type Reflect, defineView } from 'foldkit/submodel'

// MODEL

/** Schema for the switch component's state, tracking the toggle's checked status. */
export const Model = S.Struct({
  id: S.String,
  isChecked: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the user toggles the switch via click or Space key. */
export const Toggled = m('Toggled')

/** Sent to set the checked state to a specific value. Use this for
 *  programmatic state assignment (e.g. a "select all" handler that forces
 *  all child switches to the same state) where `Toggled`'s flip semantics
 *  would not reliably reach the desired state. */
export const SetChecked = m('SetChecked', { isChecked: S.Boolean })

/** Schema for all messages the switch component can produce. */
export const Message = S.Union([Toggled, SetChecked])

export type Toggled = typeof Toggled.Type

export type SetChecked = typeof SetChecked.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent each time the switch toggles. Carries the new
 *  checked state. Consumers pattern-match this in their `GotSwitchMessage`
 *  handler to lift the toggle into a domain Message (e.g., persisting the
 *  setting, dispatching a sync command). */
export const ToggledChecked = m('ToggledChecked', { isChecked: S.Boolean })

/** Union of out-messages the switch component can produce. Surfaced as
 *  the third element of `update`'s return tuple and pattern-matched by
 *  the parent. */
export const OutMessage = S.Union([ToggledChecked])

export type ToggledChecked = typeof ToggledChecked.Type
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a switch model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isChecked?: boolean
}>

/** Creates an initial switch model from a config. Defaults to unchecked. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isChecked: config.isChecked ?? false,
})

// UPDATE

/** Processes a switch message and returns the next model, commands, and
 *  a `ToggledChecked` OutMessage carrying the new checked state. */
export const update = (
  model: Model,
  message: Message,
): readonly [
  Model,
  ReadonlyArray<Command<Message>>,
  Option.Option<OutMessage>,
] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [
        Model,
        ReadonlyArray<Command<Message>>,
        Option.Option<OutMessage>,
      ]
    >(),
    M.tagsExhaustive({
      Toggled: () => {
        const nextIsChecked = !model.isChecked
        return [
          evo(model, { isChecked: () => nextIsChecked }),
          [],
          Option.some(ToggledChecked({ isChecked: nextIsChecked })),
        ]
      },
      SetChecked: ({ isChecked }) => [
        evo(model, { isChecked: () => isChecked }),
        [],
        Option.some(ToggledChecked({ isChecked })),
      ],
    }),
  )

/** Programmatically sets the checked state. Emits a `ToggledChecked`
 *  OutMessage just like a user-initiated toggle. Use this in domain-event
 *  handlers where you need to force a specific state. */
export const setChecked = (
  model: Model,
  isChecked: boolean,
): readonly [
  Model,
  ReadonlyArray<Command<Message>>,
  Option.Option<OutMessage>,
] => update(model, SetChecked({ isChecked }))

/** Reflects an externally-sourced checked state onto the model without
 *  emitting an OutMessage. Use this to mirror external truth (saved
 *  settings, a server value) onto the switch without triggering the
 *  downstream reaction a user toggle would cause. Contrast with
 *  `setChecked`, which emits `ToggledChecked` so the parent reacts to a
 *  programmatic assignment the same way it reacts to a user toggle. Returns
 *  the model directly because it produces no commands and no OutMessage. */
export const reflectChecked: Reflect<Model, boolean> = Function.dual(
  2,
  (model: Model, isChecked: boolean): Model =>
    evo(model, { isChecked: () => isChecked }),
)

// VIEW

/** Attribute groups the switch component provides to the consumer's
 *  `toView` callback. Each group is a `ReadonlyArray<ChildAttribute>`
 *  whose event handlers dispatch through the Switch's boundary at
 *  event-fire time. See {@link Checkbox.CheckboxAttributes} for the full
 *  routing model. */
export type SwitchAttributes = Readonly<{
  button: ReadonlyArray<ChildAttribute>
  label: ReadonlyArray<ChildAttribute>
  description: ReadonlyArray<ChildAttribute>
  hiddenInput: ReadonlyArray<ChildAttribute>
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  toView: (attributes: SwitchAttributes) => Html
  isDisabled?: boolean
  name?: string
  value?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible switch toggle by building ARIA attribute groups
 *  and delegating layout to the consumer's `toView` callback. Designed
 *  to be embedded via `h.submodel`. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, isChecked } = model
    const { isDisabled = false, name, value: formValue = 'on' } = viewInputs

    const handleKeyUp = (key: string): Option.Option<Toggled> =>
      M.value(key).pipe(
        M.when(' ', () => Option.some(Toggled())),
        M.orElse(() => Option.none()),
      )

    const checkedAttributes = isChecked ? [h.DataAttribute('checked', '')] : []

    const disabledAttributes = isDisabled
      ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
      : []

    const buttonAttributes = [
      h.Role('switch'),
      h.AriaChecked(isChecked),
      h.AriaLabelledBy(labelId(id)),
      h.AriaDescribedBy(descriptionId(id)),
      h.Tabindex(0),
      ...checkedAttributes,
      ...disabledAttributes,
      ...(isDisabled
        ? []
        : [h.OnClick(Toggled()), h.OnKeyUpPreventDefault(handleKeyUp)]),
    ]

    const labelAttributes = [
      h.Id(labelId(id)),
      ...(isDisabled ? [] : [h.OnClick(Toggled())]),
    ]

    const descriptionAttributes = [h.Id(descriptionId(id))]

    const hiddenInputAttributes = name
      ? [h.Type('hidden'), h.Name(name), h.Value(isChecked ? formValue : '')]
      : []

    return viewInputs.toView({
      button: childAttributes(buttonAttributes),
      label: childAttributes(labelAttributes),
      description: childAttributes(descriptionAttributes),
      hiddenInput: childAttributes(hiddenInputAttributes),
    })
  },
)
