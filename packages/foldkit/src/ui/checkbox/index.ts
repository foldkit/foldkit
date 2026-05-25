import { Function, Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command/index.js'
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

/** Schema for the checkbox component's state, tracking the checked status. */
export const Model = S.Struct({
  id: S.String,
  isChecked: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the user toggles the checkbox via click or Space key. */
export const Toggled = m('Toggled')

/** Sent to set the checked state to a specific value. Use this for
 *  programmatic state assignment (e.g. a "select all" handler that forces
 *  all child checkboxes to the same state) where `Toggled`'s flip semantics
 *  would not reliably reach the desired state. */
export const SetChecked = m('SetChecked', { isChecked: S.Boolean })

/** Schema for all messages the checkbox component can produce. */
export const Message = S.Union([Toggled, SetChecked])

export type Toggled = typeof Toggled.Type

export type SetChecked = typeof SetChecked.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent each time the checkbox toggles. Carries the new
 *  checked state. Consumers pattern-match this in their `GotCheckboxMessage`
 *  handler to lift the toggle into a domain Message (e.g., persisting the
 *  flag, dispatching a save command). */
export const ToggledChecked = m('ToggledChecked', { isChecked: S.Boolean })

/** Union of out-messages the checkbox component can produce. Surfaced as
 *  the third element of `update`'s return tuple and pattern-matched by
 *  the parent. */
export const OutMessage = S.Union([ToggledChecked])

export type ToggledChecked = typeof ToggledChecked.Type
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a checkbox model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isChecked?: boolean
}>

/** Creates an initial checkbox model from a config. Defaults to unchecked. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isChecked: config.isChecked ?? false,
})

// UPDATE

/** Processes a checkbox message and returns the next model, commands,
 *  and a `ToggledChecked` OutMessage carrying the new checked state. */
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
 *  handlers where you need to force a specific state (e.g. "select all"). */
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
 *  settings, a server value) onto the checkbox without triggering the
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

/** Attribute groups the checkbox component provides to the consumer's
 *  `toView` callback. Each group is a `ReadonlyArray<ChildAttribute>`:
 *  attributes published from inside Checkbox's own boundary that the
 *  consumer can spread directly into its own element attribute arrays:
 *
 *  ```ts
 *  toView: attributes =>
 *    h.div(
 *      [...attributes.checkbox, h.Class('my-class'), h.OnClick(MyOwnMsg())],
 *      [...],
 *    )
 *  ```
 *
 *  Checkbox's own `OnClick(Toggled())` handlers (carried inside
 *  `attributes.checkbox` etc.) dispatch `Toggled` through Checkbox's
 *  boundary wrap at event-fire time. The consumer's own
 *  `OnClick(MyOwnMsg())` lives in the parent's boundary and dispatches
 *  unwrapped. The two routes are tracked separately by the runtime; the
 *  consumer never has to think about which boundary an attribute belongs
 *  to. */
export type CheckboxAttributes = Readonly<{
  checkbox: ReadonlyArray<ChildAttribute>
  label: ReadonlyArray<ChildAttribute>
  description: ReadonlyArray<ChildAttribute>
  hiddenInput: ReadonlyArray<ChildAttribute>
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *  Slot content (`toView`) and behavioral flags live here; the parent
 *  declares them at the embed site rather than threading them through the
 *  Submodel as a generic-parameterized callback. */
export type ViewInputs = Readonly<{
  toView: (attributes: CheckboxAttributes) => Html
  isDisabled?: boolean
  isIndeterminate?: boolean
  name?: string
  value?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible checkbox by building ARIA attribute groups and
 *  delegating layout to the consumer's `toView` callback. Embedded via
 *  `h.submodel`. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, isChecked } = model
    const {
      isDisabled = false,
      isIndeterminate = false,
      name,
      value: formValue = 'on',
    } = viewInputs

    const handleKeyUp = (key: string): Option.Option<Toggled> =>
      M.value(key).pipe(
        M.when(' ', () => Option.some(Toggled())),
        M.orElse(() => Option.none()),
      )

    const stateAttributes = isIndeterminate
      ? [h.DataAttribute('indeterminate', '')]
      : isChecked
        ? [h.DataAttribute('checked', '')]
        : []

    const disabledAttributes = isDisabled
      ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
      : []

    const checkboxAttributes = [
      h.Role('checkbox'),
      h.AriaChecked(isIndeterminate ? 'mixed' : isChecked),
      h.AriaLabelledBy(labelId(id)),
      h.AriaDescribedBy(descriptionId(id)),
      h.Tabindex(0),
      ...stateAttributes,
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
      checkbox: childAttributes(checkboxAttributes),
      label: childAttributes(labelAttributes),
      description: childAttributes(descriptionAttributes),
      hiddenInput: childAttributes(hiddenInputAttributes),
    })
  },
)
