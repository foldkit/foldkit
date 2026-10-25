import {
  Array,
  Effect,
  Layer,
  Match,
  Option,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import { type Update } from 'foldkit'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { type MessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { idSelector } from '../internal/selectors.js'
import { keyToIndex } from '../keyboard.js'
import { RadioGroupNamespace } from './definition.js'

// MODEL

/** Controls the radio group layout direction and which arrow keys navigate between options. */
export const Orientation = Schema.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

/** Schema for the radio group's private interaction state. The selected
 *  option is owned by the parent and passed in via `ViewInputs.selectedValue`,
 *  so it is not stored here. `maybeFocusedIndex` is the roving-tabindex
 *  cursor: `None` means keyboard focus follows the selection, and a read-only
 *  group stores `Some(index)` while focus diverges from it. */
export const Model = Schema.Struct({
  id: Schema.String,
  maybeFocusedIndex: Schema.Option(Schema.Number),
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the radio group can produce. */
export const Message = defineMessageUnion({
  SelectedOption: {
    index: Schema.Number,
    value: Schema.String,
  },
  FocusedOption: { index: Schema.Number },
  CompletedFocusOption: {},
})

export type SelectedOption = typeof Message.SelectedOption.Type
export type FocusedOption = typeof Message.FocusedOption.Type

export type Message = typeof Message.Type

// OUT MESSAGE

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

/** Union of OutMessages the radio group can produce. The parent's
 *  parent bindings handle them through their OutMessage policy. */
export const OutMessage = defineMessageUnion({
  Selected: {
    value: Schema.String,
    index: Schema.Number,
  },
})

/** The OutMessage union interface on a completed RadioGroup, refined to its
 * Value type. */
type OutMessageSchema<Value extends string = string> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{ value: Schema.Schema<Value> }>
          }>
      >
    : never

/** Generic over `Value extends string` so consumers using
 *  `RadioGroup.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

// INIT

/** Configuration for creating a radio group model with `init`. */
export type InitConfig = Readonly<{
  id: string
}>

const makeInitialModel = (config: InitConfig): Model => ({
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
export const FocusOption = RadioGroupNamespace.makeCommand('FocusOption', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedFocusOption],
  handler: function* () {
    return ({ id, index }) =>
      Dom.focus(idSelector(optionId(id, index))).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusOption()),
      )
  },
})

/** Effect providers used by the RadioGroup component. */
export const EffectsLayer = Layer.mergeAll(FocusOption.layer)

const RadioGroupDefinition = RadioGroupNamespace.makeDefinition({
  Model,
  Message,
  OutMessage,
})
const RadioGroupComposition = RadioGroupDefinition.makeComposition()

/** Creates an initial RadioGroup Model and Commands from a config. Focus follows the
 *  selected option until the user navigates a read-only group, so
 *  `maybeFocusedIndex` starts `None`. */
export const init = RadioGroupComposition.makeInit((config: InitConfig) => ({
  model: makeInitialModel(config),
}))

/** Processes a RadioGroup Message and returns the next Model, optional
 *  Commands, and an optional OutMessage. `Selected` fires when an option is
 *  committed via click or keyboard; the parent stores the new value and passes
 *  it back in as `selectedValue`. */
export const update = RadioGroupComposition.makeUpdate({
  SelectedOption: (model, { index, value }) => ({
    model: modifyFields(model, { maybeFocusedIndex: () => Option.none() }),
    commands: [FocusOption({ id: model.id, index })],
    outMessage: OutMessage.Selected({ value, index }),
  }),
  FocusedOption: (model, { index }) => ({
    model: modifyFields(model, {
      maybeFocusedIndex: () => Option.some(index),
    }),
    commands: [FocusOption({ id: model.id, index })],
  }),
  CompletedFocusOption: RadioGroupDefinition.makeNoopStep(),
})

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

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs`
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
  hasOptionDescription?: (value: Value, index: number) => boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  name?: string
}>

const internalView = RadioGroupComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const { id, maybeFocusedIndex } = model
    const {
      options,
      selectedValue,
      ariaLabel,
      toView,
      orientation = 'Vertical',
      isOptionDisabled: isOptionDisabledFn,
      hasOptionDescription: hasOptionDescriptionFn,
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

    const { nextKey, previousKey } = Match.value(orientation).pipe(
      Match.when('Horizontal', () => ({
        nextKey: 'ArrowRight',
        previousKey: 'ArrowLeft',
      })),
      Match.when('Vertical', () => ({
        nextKey: 'ArrowDown',
        previousKey: 'ArrowUp',
      })),
      Match.exhaustive,
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
        Option.map(value => Message.SelectedOption({ index, value })),
      )

    const handleSelectingKeyDown = (
      currentIndex: number,
      key: string,
    ): Option.Option<SelectedOption> =>
      Match.value(key).pipe(
        Match.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => optionSelectedAt(resolveKeyIndex(key)),
        ),
        Match.when(' ', () => optionSelectedAt(currentIndex)),
        Match.orElse(() => Option.none()),
      )

    const handleReadOnlyKeyDown = (key: string): Option.Option<FocusedOption> =>
      Match.value(key).pipe(
        Match.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () =>
            Option.some(Message.FocusedOption({ index: resolveKeyIndex(key) })),
        ),
        Match.orElse(() => Option.none()),
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
            : [h.OnClick(Message.SelectedOption({ index, value }))]
        const keyDownAttributes = isOptionDisabledNow
          ? []
          : [h.OnKeyDownPreventDefault(handleKeyDown(index))]
        const describedByAttributes =
          Predicate.isNotUndefined(hasOptionDescriptionFn) &&
          hasOptionDescriptionFn(value, index)
            ? [h.AriaDescribedBy(descriptionId(id, index))]
            : []

        const optionAttributes = [
          h.Id(optionId(id, index)),
          h.Type('button'),
          h.Role('radio'),
          h.AriaChecked(isSelected),
          h.AriaLabelledBy(labelId(id, index)),
          ...describedByAttributes,
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

const prepareRadioGroupBlock = () =>
  RadioGroupComposition.prepareBlock({
    init,
    update,
    view: internalView,
    EffectsLayer,
  })
/** Complete RadioGroup Block definition. */
export const block: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareRadioGroupBlock
> = Block.assemble(prepareRadioGroupBlock)

const makeBlockParts = <Value extends string>() => {
  type GenericReturn = Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage<Value>,
    Update.RequirementsOf<typeof update>
  >

  const castReturn = (result: ReturnType<typeof update>): GenericReturn =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    result as unknown as GenericReturn
  const RefinedOutMessage =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    OutMessage as unknown as OutMessageSchema<Value>
  const RadioGroupComposition = RadioGroupNamespace.makeDefinition({
    Model,
    Message,
    OutMessage: RefinedOutMessage,
  }).makeComposition()
  const init = RadioGroupComposition.makeInit((config: InitConfig) => ({
    model: makeInitialModel(config),
  }))
  const refinedUpdate = RadioGroupComposition.makeUpdate({
    SelectedOption: (model, message) => castReturn(update(model, message)),
    FocusedOption: (model, message) => castReturn(update(model, message)),
    CompletedFocusOption: (model, message) =>
      castReturn(update(model, message)),
  })
  const refinedView =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    internalView as unknown as (
      model: Model,
      viewInputs: ViewInputs<Value>,
      h: Parameters<typeof internalView>[2],
    ) => Html
  const view = RadioGroupComposition.makeView.withInputs<ViewInputs<Value>>(
    (model, viewInputs, h) => refinedView(model, viewInputs, h),
  )

  return {
    composition: RadioGroupComposition,
    implementation: {
      init,
      update: refinedUpdate,
      view,
      EffectsLayer,
    },
  }
}

type BlockParts<Value extends string> = ReturnType<typeof makeBlockParts<Value>>

/** A completed RadioGroup Block refined to one Value type. */
export interface Completed<
  Value extends string = string,
> extends Block.CompletedWithViewAndOutMessage<
  BlockParts<Value>['composition'],
  BlockParts<Value>['implementation']
> {}

const makeBlock = <Value extends string>(): Completed<Value> => {
  const { composition, implementation } = makeBlockParts<Value>()

  const prepare = () => composition.prepareBlock(implementation)
  const completedBlock: Block.FromAssemblyWithViewAndOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return completedBlock
}

/**
 * Creates a completed RadioGroup Block refined to one Value type. Declare
 * `RadioGroup.create<Plan>()` once at module scope, then connect that Block to
 * the parent. Its view inputs and `Selected.value` share the Value type;
 * the parent Model owns the selected option.
 */
export const create = <Value extends string = string>(): Completed<Value> =>
  makeBlock<Value>()
