import {
  Array,
  Effect,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String,
  pipe,
} from 'effect'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import { type View as SubmodelView, defineView } from 'foldkit/submodel'

import { idSelector } from '../internal/selectors.js'
import { keyToIndex } from '../keyboard.js'

// MODEL

/** Controls the radio group layout direction and which arrow keys navigate between options. */
export const Orientation = S.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

/** Schema for the radio group's private interaction state. The selected
 *  option is owned by the parent and passed in via `ViewInputs.selectedValue`,
 *  so it is not stored here. `maybeFocusedIndex` is the roving-tabindex
 *  cursor: `None` means keyboard focus follows the selection, and a read-only
 *  group stores `Some(index)` while focus diverges from it. */
export const Model = S.Struct({
  id: S.String,
  maybeFocusedIndex: S.Option(S.Number),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when an option is committed via click or keyboard. Commits the option
 *  as the new selection and moves focus onto it. */
export const SelectedOption = m('SelectedOption', {
  index: S.Number,
  value: S.String,
})
/** Sent when an option receives keyboard focus without being committed, which
 *  is how a read-only group navigates. */
export const FocusedOption = m('FocusedOption', { index: S.Number })
/** Sent when the focus-option command completes. */
export const CompletedFocusOption = m('CompletedFocusOption')

/** Union of all messages the radio group can produce. */
export const Message: S.Union<
  [typeof SelectedOption, typeof FocusedOption, typeof CompletedFocusOption]
> = S.Union([SelectedOption, FocusedOption, CompletedFocusOption])

export type SelectedOption = typeof SelectedOption.Type
export type FocusedOption = typeof FocusedOption.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent when an option is committed via click or keyboard. Carries both the option's value (typed as `Value` via `RadioGroup.create<Value>()`) and its index. Generic at the type level; the schema stores `value: string` and the factory's fenced cast types it as `Value`. */
export const Selected = m('Selected', {
  value: S.String,
  index: S.Number,
})

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

/** Union of out-messages the radio group can produce. Surfaced as the third element of `update`'s return tuple and pattern-matched by the parent. */
export const OutMessage = S.Union([Selected])

/** Generic over `Value extends string` so consumers using
 *  `RadioGroup.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

// INIT

/** Configuration for creating a radio group model with `init`. */
export type InitConfig = Readonly<{
  id: string
}>

/** Creates an initial radio group model from a config. Focus follows the
 *  selected option until the user navigates a read-only group, so
 *  `maybeFocusedIndex` starts `None`. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  maybeFocusedIndex: Option.none(),
})

// UPDATE

const optionId = (id: string, index: number): string => `${id}-option-${index}`

const labelId = (id: string, index: number): string =>
  `${id}-option-${index}-label`

const descriptionId = (id: string, index: number): string =>
  `${id}-option-${index}-description`

/** Moves focus to the option at the given index. */
export const FocusOption = Command.define('FocusOption', {
  args: { id: S.String, index: S.Number },
  messages: [CompletedFocusOption],
  execute: ({ id, index }) =>
    Dom.focus(idSelector(optionId(id, index))).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusOption()),
    ),
})

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

/** Processes a radio group message and returns the next model, commands, and
 *  an optional OutMessage. `Selected` fires when an option is committed via
 *  click or keyboard; the parent stores the new value and passes it back in as
 *  `selectedValue`. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      SelectedOption: ({ index, value }) => [
        evo(model, { maybeFocusedIndex: () => Option.none() }),
        [FocusOption({ id: model.id, index })],
        Option.some(Selected({ value, index })),
      ],
      FocusedOption: ({ index }) => [
        evo(model, { maybeFocusedIndex: () => Option.some(index) }),
        [FocusOption({ id: model.id, index })],
        Option.none(),
      ],
      CompletedFocusOption: () => [model, [], Option.none()],
    }),
  )

// VIEW

/** Per-option render info passed to the consumer's `toView`. The consumer
 *  spreads `option`, `label`, and `description` onto whichever elements carry
 *  that role in their layout. Generic over `Value extends string` so
 *  `option.value` carries the consumer's union type.
 *
 *  The `option` bundle sets `type="button"` so that rendering the option as a
 *  `button` element inside a `form` element selects without also submitting the
 *  form. Setting it is harmless on the other elements an option might use, such
 *  as a `div` or a `span`, because the builder assigns a DOM property rather
 *  than an HTML attribute. Spread a later `h.Type` to override it. */
export type OptionInfo<Value extends string = string> = Readonly<{
  value: Value
  index: number
  isSelected: boolean
  isActive: boolean
  isDisabled: boolean
  isReadOnly: boolean
  option: ReadonlyArray<ChildAttribute>
  label: ReadonlyArray<ChildAttribute>
  description: ReadonlyArray<ChildAttribute>
}>

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `group`: ARIA + role attributes for the wrapping radiogroup element.
 *  - `options`: one entry per option in `viewInputs.options`, in the same
 *    order. Includes the value, derived state, and the attribute bundles for
 *    the option element, its label, and its description.
 *  - `selectedValue`: the currently-selected value, if any. Convenient for the
 *    consumer when rendering selected-state visuals next to the option
 *    attributes.
 *  - `hiddenInput`: when `name` was supplied, attributes for a hidden form
 *    input carrying the selected value. The consumer renders the `<input>`
 *    themselves. Empty array when `name` is undefined. */
export type RenderInfo<Value extends string = string> = Readonly<{
  group: ReadonlyArray<ChildAttribute>
  options: ReadonlyArray<OptionInfo<Value>>
  selectedValue: Option.Option<Value>
  hiddenInput: ReadonlyArray<ChildAttribute>
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs`
 *  field. Generic over `Value extends string` so consumers using
 *  `RadioGroup.create<MyUnion>()` receive `option.value: MyUnion` in `toView`
 *  and `(value: MyUnion, index) => boolean` in `isOptionDisabled`, without
 *  casting.
 *
 *  - `selectedValue`: the current selection, read straight from the parent
 *    Model. `aria-checked` and the `data-checked` marker derive from it, as
 *    does the roving tabindex whenever keyboard focus has not diverged.
 *  - `isReadOnly`: keeps the group navigable but not selectable. Arrow, Home,
 *    End, PageUp, and PageDown still move focus, and the group reports that
 *    focus through `FocusedOption`, so `data-active` and `tabindex` follow it.
 *    Space and clicking do nothing. */
export type ViewInputs<Value extends string = string> = Readonly<{
  options: ReadonlyArray<Value>
  selectedValue: Option.Option<Value>
  ariaLabel: string
  toView: (render: RenderInfo<Value>) => Html
  orientation?: Orientation
  isOptionDisabled?: (value: Value, index: number) => boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  name?: string
}>

const internalView = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { id, maybeFocusedIndex } = model
    const {
      options,
      selectedValue,
      ariaLabel,
      toView,
      orientation = 'Vertical',
      isOptionDisabled: isOptionDisabledFn,
      isDisabled: isGroupDisabled = false,
      isReadOnly = false,
      name,
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

    const firstEnabledIndex = pipe(
      options.length,
      Array.makeBy(index => index),
      Array.findFirst(Predicate.not(isDisabled)),
      Option.getOrElse(() => 0),
    )

    // NOTE: The selected index only becomes the roving tab stop when it is
    // enabled. A disabled selected option would otherwise be the group's sole
    // tab stop with no keydown handler, stranding keyboard navigation.
    const selectionTabStopIndex = pipe(
      selectedIndex,
      Option.filter(Predicate.not(isDisabled)),
      Option.getOrElse(() => firstEnabledIndex),
    )

    const isNavigableIndex = (index: number): boolean =>
      index < options.length && !isDisabled(index)

    const focusedIndex = pipe(
      maybeFocusedIndex,
      Option.filter(isNavigableIndex),
      Option.getOrElse(() => selectionTabStopIndex),
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

    const optionSelectedAt = (index: number): Option.Option<SelectedOption> =>
      pipe(
        options,
        Array.get(index),
        Option.map(value => SelectedOption({ index, value })),
      )

    const handleSelectingKeyDown = (
      currentIndex: number,
      key: string,
    ): Option.Option<SelectedOption> =>
      M.value(key).pipe(
        M.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => optionSelectedAt(resolveKeyIndex(key)),
        ),
        M.when(' ', () => optionSelectedAt(currentIndex)),
        M.orElse(() => Option.none()),
      )

    const handleReadOnlyKeyDown = (key: string): Option.Option<FocusedOption> =>
      M.value(key).pipe(
        M.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => Option.some(FocusedOption({ index: resolveKeyIndex(key) })),
        ),
        M.orElse(() => Option.none()),
      )

    const handleKeyDown =
      (currentIndex: number) =>
      (key: string): Option.Option<SelectedOption | FocusedOption> => {
        if (isReadOnly) {
          return handleReadOnlyKeyDown(key)
        } else {
          return handleSelectingKeyDown(currentIndex, key)
        }
      }

    const optionInfos: ReadonlyArray<OptionInfo> = Array.map(
      options,
      (value, index) => {
        const isSelected = Option.exists(
          selectedIndex,
          selectedOptionIndex => selectedOptionIndex === index,
        )
        const isActive = index === focusedIndex
        const isOptionDisabledNow = isDisabled(index)

        const checkedAttributes = isSelected
          ? [h.DataAttribute('checked', '')]
          : []
        const activeAttributes = isActive ? [h.DataAttribute('active', '')] : []
        const disabledAttributes = isOptionDisabledNow
          ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
          : []
        const readOnlyAttributes = isReadOnly
          ? [h.DataAttribute('readonly', '')]
          : []
        const clickAttributes =
          isOptionDisabledNow || isReadOnly
            ? []
            : [h.OnClick(SelectedOption({ index, value }))]
        const keyDownAttributes = isOptionDisabledNow
          ? []
          : [h.OnKeyDownPreventDefault(handleKeyDown(index))]

        const optionAttributes = [
          h.Id(optionId(id, index)),
          h.Type('button'),
          h.Role('radio'),
          h.AriaChecked(isSelected),
          h.AriaLabelledBy(labelId(id, index)),
          h.AriaDescribedBy(descriptionId(id, index)),
          h.Tabindex(isActive ? 0 : -1),
          ...checkedAttributes,
          ...activeAttributes,
          ...disabledAttributes,
          ...readOnlyAttributes,
          ...clickAttributes,
          ...keyDownAttributes,
        ]

        const labelAttributes = [h.Id(labelId(id, index))]
        const descriptionAttributes = [h.Id(descriptionId(id, index))]

        return {
          value,
          index,
          isSelected,
          isActive,
          isDisabled: isOptionDisabledNow,
          isReadOnly,
          option: childAttributes(optionAttributes),
          label: childAttributes(labelAttributes),
          description: childAttributes(descriptionAttributes),
        }
      },
    )

    const groupReadOnlyAttributes = isReadOnly
      ? [h.AriaReadonly(true), h.DataAttribute('readonly', '')]
      : []

    const groupAttributes = [
      h.Role('radiogroup'),
      h.AriaOrientation(String.toLowerCase(orientation)),
      h.AriaLabel(ariaLabel),
      ...groupReadOnlyAttributes,
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

/** The `view` and `update` pair that `RadioGroup.create` returns, bound to one
 *  `Value` type. Name it to annotate a value that holds a created bundle,
 *  such as a field on a config object or a function parameter that takes
 *  the bundle rather than calling `create` itself. */
export type Bundle<Value extends string = string> = Readonly<{
  view: SubmodelView<Model, Message, ViewInputs<Value>>
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
}>

/** Pairs the radio group `view` and `update` behind a single Value-typed
 *  entry point. Declare once at module scope so consumers receive
 *  `option.value: Value` in `toView` and the `Selected` OutMessage without an
 *  `as` cast:
 *
 *  ```ts
 *  const PlanRadioGroup = RadioGroup.create<Plan>()
 *
 *  // In view (selectedValue is the parent-owned selection):
 *  h.submodel({ view: PlanRadioGroup.view, viewInputs: { selectedValue, ... }, ... })
 *
 *  // In update, fold the Selected OutMessage into your Model:
 *  const [next, commands, maybeOutMessage] = PlanRadioGroup.update(model, message)
 *  ```
 *
 *  The internal view stays typed `ReadonlyArray<string>`; consumers can
 *  pass a `ReadonlyArray<MyUnion>` (assignable) and the fenced cast inside
 *  `create` types `OptionInfo.value` as `MyUnion`. */
export const create = <Value extends string = string>(): Bundle<Value> => {
  type GenericReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  const cast = (result: UpdateReturn): GenericReturn =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    result as unknown as GenericReturn

  return {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    view: internalView as unknown as SubmodelView<
      Model,
      Message,
      ViewInputs<Value>
    >,
    update: (model, message) => cast(update(model, message)),
  }
}
