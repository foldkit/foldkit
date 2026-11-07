import {
  Array,
  Context,
  Effect,
  Layer,
  Match,
  Option,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import * as BlockFamily from 'foldkit/internal/block'
import { defineMessageUnion } from 'foldkit/message'
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

/** Self-contained selected-value Codec; serialization executes synchronously. */
export type ValueSchema<
  Value extends string,
  ValueEncoded = Value,
> = Schema.Codec<Value, ValueEncoded, never, never> &
  Readonly<{ '~type.make': Value }>

/** Builds local Messages from the selected value's runtime contract. */
export const makeMessage = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) =>
  defineMessageUnion({
    SelectedOption: {
      index: Schema.Number,
      value: Value,
    },
    FocusedOption: { index: Schema.Number },
    CompletedFocusOption: {},
  })

/** Local Messages for unrestricted string values. */
export const Message = makeMessage(Schema.String)
export type Message = typeof Message.Type
/** Local Messages retaining the exact selected-value Codec. */
export type MessageSchema<
  Value extends string,
  ValueEncoded = Value,
> = ReturnType<typeof makeMessage<Value, ValueEncoded>>

export type SelectedOption = typeof Message.SelectedOption.Type
export type FocusedOption = typeof Message.FocusedOption.Type

// OUT MESSAGE

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

/** Builds selection OutMessages from the selected value's runtime contract. */
export const makeOutMessage = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) =>
  defineMessageUnion({
    Selected: { value: Value, index: Schema.Number },
  })

/** Selection OutMessages for unrestricted string values. */
export const OutMessage = makeOutMessage(Schema.String)
export type OutMessage<Value extends string = string> = Selected<Value>
/** Selection OutMessages retaining decoded and encoded value contracts. */
export type OutMessageSchema<
  Value extends string = string,
  ValueEncoded = Value,
> = ReturnType<typeof makeOutMessage<Value, ValueEncoded>>

// INIT

/** Configuration for creating a radio group model with `init`. */
export const InitConfig = Schema.Struct({ id: Schema.String })
export type InitConfig = typeof InitConfig.Type

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

/** @internal Nominal identity of this component contract. */
export const RadioGroupKey = Symbol('RadioGroup')
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
 *  `RadioGroup.makeBlock(Value)` receive `option.value: MyUnion` in `toView`
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

const makeAuthoring = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => {
  const Message: MessageSchema<Value, ValueEncoded> = makeMessage(Value)
  const OutMessage: OutMessageSchema<Value, ValueEncoded> =
    makeOutMessage(Value)
  type SelectedOption = typeof Message.SelectedOption.Type

  const Definition = BlockFamily.makeFamilyDeclaration(RadioGroupNamespace, {
    key: RadioGroupKey,
    InitArgs: Schema.Tuple([InitConfig]),
    view: {
      kind: 'Element',
      Inputs: Block.makeInputContract<ViewInputs<Value>>(),
    },
    Model,
    Message,
    OutMessage,
  })
  const RadioGroupComposition = Definition.makeComposition()

  /** Creates an initial RadioGroup Model and Commands from a config. Focus follows the
   *  selected option until the user navigates a read-only group, so
   *  `maybeFocusedIndex` starts `None`. */
  const init = RadioGroupComposition.makeInit(config => ({
    model: makeInitialModel(config),
  }))

  /** Processes a RadioGroup Message and returns the next Model, optional
   *  Commands, and an optional OutMessage. `Selected` fires when an option is
   *  committed via click or keyboard; the parent stores the new value and passes
   *  it back in as `selectedValue`. */
  const update = RadioGroupComposition.makeUpdate({
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
    CompletedFocusOption: Definition.makeNoopStep(),
  })

  const internalView = RadioGroupComposition.makeView.withInputs(
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

      const handleReadOnlyKeyDown = (
        key: string,
      ): Option.Option<FocusedOption> =>
        Match.value(key).pipe(
          Match.whenOr(
            nextKey,
            previousKey,
            'Home',
            'End',
            'PageUp',
            'PageDown',
            () =>
              Option.some(
                Message.FocusedOption({ index: resolveKeyIndex(key) }),
              ),
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

      const optionInfos: ReadonlyArray<OptionInfo<Value>> = Array.map(
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
          const activeAttributes = isActive
            ? [h.DataAttribute('active', '')]
            : []
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

  return { Definition, init, update, view: internalView }
}

type Authoring<Value extends string, ValueEncoded> = ReturnType<
  typeof makeAuthoring<Value, ValueEncoded>
>

const construct = <Value extends string, ValueEncoded>(
  authoring: Authoring<Value, ValueEncoded>,
) =>
  authoring.Definition.makeLayer({
    init: authoring.init,
    update: authoring.update,
    view: authoring.view,
    EffectsLayer,
  })

interface RadioGroupImplementation extends Block.FamilyLifetime {
  readonly construct: typeof construct
}

/** @internal Scoped provider for Schema-specific RadioGroup implementations. */
export class RadioGroupFamily extends Context.Service<
  RadioGroupFamily,
  RadioGroupImplementation
>()('foldkit/ui/RadioGroup') {}

/** Constructs RadioGroup implementations with their selected-value Codecs. */
export const layer = Layer.effect(
  RadioGroupFamily,
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct }
  }),
)

const declareBlock = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => {
  const authoring = makeAuthoring(Value)

  return BlockFamily.resolveFamily(
    authoring.Definition,
    RadioGroupFamily,
    implementation => implementation.construct(authoring),
  )
}

type Contract<Value extends string, ValueEncoded> = ReturnType<
  typeof declareBlock<Value, ValueEncoded>
>
/** Passive RadioGroup contract retaining its exact selected-value Codec. */
export interface Completed<
  Value extends string = string,
  ValueEncoded = Value,
> extends Contract<Value, ValueEncoded> {}

/** Declares a RadioGroup contract. Pass a string Value Schema, or omit it for
 * unrestricted strings. Provide RadioGroup.layer when constructing the parent.
 *
 * @example
 * ```ts
 * const Plan = Schema.Literals(['Basic', 'Pro'])
 * const PlanRadioGroupBlock = RadioGroup.makeBlock(Plan)
 * ```
 */
export function makeBlock(): Completed<string>
export function makeBlock<Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
): Completed<Value, ValueEncoded>
export function makeBlock(
  Value: ValueSchema<string, unknown> = Schema.String,
): object {
  return declareBlock(Value)
}

const defaultAuthoring = makeAuthoring(Schema.String)
/** @internal Canonical initializer used by library tests. */
export const init = defaultAuthoring.init
/** @internal Canonical update used by library tests. */
export const update = defaultAuthoring.update
/** @internal Default string contract and provider used by interaction tests. */
export const block = {
  block: BlockFamily.resolveFamily(
    defaultAuthoring.Definition,
    RadioGroupFamily,
    implementation => implementation.construct(defaultAuthoring),
  ),
  layer,
}
