import {
  Array,
  Effect,
  Function,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String,
  pipe,
} from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import {
  type ChildAttribute,
  type Html,
  type SubmodelView,
  childAttributes,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type { Reflect } from '../../submodel/submodel.js'
import { keyToIndex } from '../keyboard.js'

// MODEL

/** Controls the radio group layout direction and which arrow keys navigate between options. */
export const Orientation = S.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

/** Schema for the radio group component's state, tracking the selected value and orientation. */
export const Model = S.Struct({
  id: S.String,
  selectedValue: S.Option(S.String),
  orientation: Orientation,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when a radio option is selected via click or keyboard navigation. */
export const SelectedOption = m('SelectedOption', {
  value: S.String,
  index: S.Number,
})
/** Sent when the focus-option command completes. */
export const CompletedFocusOption = m('CompletedFocusOption')

/** Union of all messages the radio group component can produce. */
export const Message: S.Union<
  [typeof SelectedOption, typeof CompletedFocusOption]
> = S.Union([SelectedOption, CompletedFocusOption])

export type SelectedOption = typeof SelectedOption.Type
export type CompletedFocusOption = typeof CompletedFocusOption.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent when an option is committed. Carries the selected
 *  value and its index. Generic over `Value extends string`: the runtime
 *  schema stores `value: string`, but the type-level OutMessage exposes
 *  `value: Value` so consumers who supply `options: ReadonlyArray<MyUnion>`
 *  receive `value: MyUnion` from the factory's `update` without casting at
 *  the call site. The cast is fenced inside this module's `update` return,
 *  sound because the value was selected from the options array the
 *  consumer supplied. */
export const Selected = m('Selected', { value: S.String, index: S.Number })

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

export const OutMessage = S.Union([Selected])

/** Generic over `Value extends string` so consumers who create the radio
 *  group via `Ui.RadioGroup.create<MyUnion>()` receive `value: MyUnion` in
 *  the `Selected` OutMessage from the factory's `update`, instead of
 *  `value: string`. Defaults to `string` for consumers that don't need the
 *  lift. */
export type OutMessage<Value extends string = string> = Selected<Value>

// INIT

/** Configuration for creating a radio group model with `init`. */
export type InitConfig = Readonly<{
  id: string
  selectedValue?: string
  orientation?: Orientation
}>

/** Creates an initial radio group model from a config. Defaults to no selection and vertical orientation. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  selectedValue: Option.fromNullishOr(config.selectedValue),
  orientation: config.orientation ?? 'Vertical',
})

// UPDATE

const optionId = (id: string, index: number): string => `${id}-option-${index}`

/** Moves focus to the radio option at the given index. */
export const FocusOption = Command.define(
  'FocusOption',
  { id: S.String, index: S.Number },
  CompletedFocusOption,
)(({ id, index }) =>
  Dom.focus(`#${optionId(id, index)}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusOption()),
  ),
)

type UpdateReturn<Value extends string = string> = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage<Value>>,
]

type InternalUpdateReturn = UpdateReturn<string>

const withInternalUpdateReturn = M.withReturnType<InternalUpdateReturn>()

/** Processes a radio group message and returns the next model, commands, and
 *  optional OutMessage. Generic over `Value extends string`: pass the consumer's
 *  union type at the call site to receive `Selected({ value: MyUnion })` without
 *  casting. Defaults to `string`. */
export const update = <Value extends string = string>(
  model: Model,
  message: Message,
): UpdateReturn<Value> => {
  const result = M.value(message).pipe(
    withInternalUpdateReturn,
    M.tagsExhaustive({
      SelectedOption: ({ value, index }) => [
        evo(model, { selectedValue: () => Option.some(value) }),
        [FocusOption({ id: model.id, index })],
        Option.some(Selected({ value, index })),
      ],
      CompletedFocusOption: () => [model, [], Option.none()],
    }),
  )
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return result as unknown as UpdateReturn<Value>
}

/** Programmatically selects a value in the radio group, updating the model
 *  and returning focus commands plus a `Selected` OutMessage. */
export const select = <Value extends string = string>(
  model: Model,
  value: Value,
  options: ReadonlyArray<Value>,
): UpdateReturn<Value> =>
  pipe(
    options,
    Array.findFirstIndex(option => option === value),
    Option.match({
      onNone: (): UpdateReturn<Value> => [model, [], Option.none()],
      onSome: index => update<Value>(model, SelectedOption({ value, index })),
    }),
  )

/** Reflects an externally-sourced selection onto the model without
 *  emitting an OutMessage or running the focus command. Use this to mirror
 *  external truth (a URL parameter, restored storage, a server push) onto
 *  the radio group's selection. Contrast with `select`, which represents a
 *  user or programmatic *choice*: it focuses the option and emits
 *  `Selected`. Takes no `options` (unlike `select`) because it sets the
 *  value directly rather than deriving a focus index. Returns the model
 *  directly because it produces no commands and no OutMessage. */
export const reflectSelectedValue: Reflect<
  Model,
  Option.Option<string>
> = Function.dual(
  2,
  (model: Model, maybeValue: Option.Option<string>): Model =>
    evo(model, { selectedValue: () => maybeValue }),
)

// VIEW

/** Per-option render info passed to the consumer's `toView`. The consumer
 *  spreads `option`, `label`, and `description` onto whichever elements
 *  carry that role in their layout. Generic over `Value extends string`:
 *  when `Ui.RadioGroup.create<MyUnion>()` is declared, `option.value` is
 *  typed `MyUnion` so the consumer can switch on it without casting. */
export type OptionInfo<Value extends string = string> = Readonly<{
  value: Value
  index: number
  isSelected: boolean
  isActive: boolean
  isDisabled: boolean
  option: ReadonlyArray<ChildAttribute>
  label: ReadonlyArray<ChildAttribute>
  description: ReadonlyArray<ChildAttribute>
}>

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `group`: ARIA + role attributes for the wrapping radiogroup element.
 *  - `options`: one entry per option in `viewInputs.options`, in the same
 *    order. Includes the value, derived state, and the attribute bundles
 *    for the option element, its label, and its description.
 *  - `selectedValue`: the currently-selected value, if any. Convenient
 *    for the consumer when rendering selected-state visuals next to the
 *    option attributes.
 *  - `hiddenInput`: when `viewInputs.name` was supplied, attributes for a
 *    hidden form input carrying the selected value. The consumer
 *    renders the `<input>` themselves. Empty array when `name` is
 *    undefined. */
export type RenderInfo<Value extends string = string> = Readonly<{
  group: ReadonlyArray<ChildAttribute>
  options: ReadonlyArray<OptionInfo<Value>>
  selectedValue: Option.Option<Value>
  hiddenInput: ReadonlyArray<ChildAttribute>
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *  Generic over `Value extends string` so consumers using
 *  `Ui.RadioGroup.create<MyUnion>()` receive `option.value: MyUnion` in
 *  `toView` and `(value: MyUnion, index) => boolean` in
 *  `isOptionDisabled`, without casting. */
export type ViewInputs<Value extends string = string> = Readonly<{
  options: ReadonlyArray<Value>
  ariaLabel: string
  toView: (render: RenderInfo<Value>) => Html
  isOptionDisabled?: (value: Value, index: number) => boolean
  isDisabled?: boolean
  name?: string
  orientation?: Orientation
}>

const labelId = (id: string, index: number): string =>
  `${id}-option-${index}-label`

const descriptionId = (id: string, index: number): string =>
  `${id}-option-${index}-description`

const internalView = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, selectedValue } = model
    const {
      options,
      ariaLabel,
      toView,
      isOptionDisabled: isOptionDisabledFn,
      isDisabled: isGroupDisabled = false,
      name,
      orientation = model.orientation,
    } = viewInputs

    const isDisabled = (index: number): boolean => {
      if (isGroupDisabled) {
        return true
      }
      if (!isOptionDisabledFn) {
        return false
      }
      return pipe(
        options,
        Array.get(index),
        Option.exists(option => isOptionDisabledFn(option, index)),
      )
    }

    const selectedIndex = Option.flatMap(selectedValue, value =>
      Array.findFirstIndex(options, option => option === value),
    )

    const focusedIndex = pipe(
      selectedIndex,
      Option.getOrElse(() =>
        pipe(
          options.length,
          Array.makeBy(index => index),
          Array.findFirst(Predicate.not(isDisabled)),
          Option.getOrElse(() => 0),
        ),
      ),
    )

    const { nextKey, previousKey } = M.value(orientation).pipe(
      M.when('Horizontal', () => ({
        nextKey: 'ArrowRight',
        previousKey: 'ArrowLeft',
      })),
      M.when('Vertical', () => ({
        nextKey: 'ArrowDown',
        previousKey: 'ArrowUp',
      })),
      M.exhaustive,
    )

    const resolveKeyIndex = keyToIndex(
      nextKey,
      previousKey,
      options.length,
      focusedIndex,
      isDisabled,
    )

    const handleKeyDown =
      (currentIndex: number) =>
      (key: string): Option.Option<SelectedOption> =>
        M.value(key).pipe(
          M.whenOr(
            nextKey,
            previousKey,
            'Home',
            'End',
            'PageUp',
            'PageDown',
            () => {
              const nextIndex = resolveKeyIndex(key)
              return pipe(
                options,
                Array.get(nextIndex),
                Option.map(value =>
                  SelectedOption({ value, index: nextIndex }),
                ),
              )
            },
          ),
          M.when(' ', () =>
            pipe(
              options,
              Array.get(currentIndex),
              Option.map(value =>
                SelectedOption({ value, index: currentIndex }),
              ),
            ),
          ),
          M.orElse(() => Option.none()),
        )

    const optionInfos: ReadonlyArray<OptionInfo> = Array.map(
      options,
      (value, index) => {
        const isSelected = Option.exists(
          selectedIndex,
          selectedIdx => selectedIdx === index,
        )
        const isFocusable = index === focusedIndex
        const isOptionDisabledNow = isDisabled(index)

        const checkedAttributes = isSelected
          ? [h.DataAttribute('checked', '')]
          : []
        const activeAttributes = isFocusable
          ? [h.DataAttribute('active', '')]
          : []
        const disabledAttributes = isOptionDisabledNow
          ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
          : []

        const optionAttributes = [
          h.Id(optionId(id, index)),
          h.Role('radio'),
          h.AriaChecked(isSelected),
          h.AriaLabelledBy(labelId(id, index)),
          h.AriaDescribedBy(descriptionId(id, index)),
          h.Tabindex(isFocusable ? 0 : -1),
          ...checkedAttributes,
          ...activeAttributes,
          ...disabledAttributes,
          ...(isOptionDisabledNow
            ? []
            : [
                h.OnClick(SelectedOption({ value, index })),
                h.OnKeyDownPreventDefault(handleKeyDown(index)),
              ]),
        ]

        const labelAttributes = [h.Id(labelId(id, index))]
        const descriptionAttributes = [h.Id(descriptionId(id, index))]

        return {
          value,
          index,
          isSelected,
          isActive: isFocusable,
          isDisabled: isOptionDisabledNow,
          option: childAttributes(optionAttributes),
          label: childAttributes(labelAttributes),
          description: childAttributes(descriptionAttributes),
        }
      },
    )

    const groupAttributes = [
      h.Role('radiogroup'),
      h.AriaOrientation(String.toLowerCase(orientation)),
      h.AriaLabel(ariaLabel),
    ]

    const hiddenInputAttributes = pipe(
      Option.fromNullishOr(name),
      Option.flatMap(inputName =>
        Option.map(selectedValue, value => [
          h.Type('hidden'),
          h.Name(inputName),
          h.Value(value),
        ]),
      ),
      Option.getOrElse(() => []),
    )

    return toView({
      group: childAttributes(groupAttributes),
      options: optionInfos,
      selectedValue,
      hiddenInput: childAttributes(hiddenInputAttributes),
    })
  },
)

/** Pairs the radio group's `view` and `update` (and `select`) behind a
 *  single Value-typed entry point. Declaring the radio group once at
 *  module scope ensures the OutMessage's `value` field carries the
 *  consumer's union type without an `as` cast at the call site:
 *
 *  ```ts
 *  const ToolRadioGroup = Ui.RadioGroup.create<Tool>()
 *
 *  // In view:
 *  h.submodel({ view: ToolRadioGroup.view, ... })
 *
 *  // In update:
 *  const [next, commands, maybeOutMessage] = ToolRadioGroup.update(model, message)
 *  // maybeOutMessage: Option<RadioGroup.OutMessage<Tool>>
 *  ```
 *
 *  The view's `ViewInputs.options` stays typed `ReadonlyArray<string>`;
 *  consumers can pass a `ReadonlyArray<MyUnion>` (assignable) and the
 *  fenced cast inside `update` types the OutMessage's `value` as
 *  `MyUnion`. */
export const create = <Value extends string = string>(): Readonly<{
  view: SubmodelView<Model, Message, ViewInputs<Value>>
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  select: (
    model: Model,
    value: Value,
    options: ReadonlyArray<Value>,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  reflectSelectedValue: Reflect<Model, Option.Option<Value>>
}> => ({
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  view: internalView as unknown as SubmodelView<
    Model,
    Message,
    ViewInputs<Value>
  >,
  update: (model, message) => update<Value>(model, message),
  select: (model, value, options) => select<Value>(model, value, options),
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  reflectSelectedValue: reflectSelectedValue as Reflect<
    Model,
    Option.Option<Value>
  >,
})
