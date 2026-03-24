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

import * as Command from '../../command'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { keyToIndex } from '../keyboard'

// MODEL

/** Controls the radio group layout direction and which arrow keys navigate between options. */
export const Orientation = S.Literal('Horizontal', 'Vertical')
export type Orientation = typeof Orientation.Type

/** Schema for the radio group component's state, tracking the selected value and orientation. */
export const Model = S.Struct({
  id: S.String,
  selectedValue: S.OptionFromSelf(S.String),
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
> = S.Union(SelectedOption, CompletedFocusOption)

export type SelectedOption = typeof SelectedOption.Type
export type CompletedFocusOption = typeof CompletedFocusOption.Type

export type Message = typeof Message.Type

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
  selectedValue: Option.fromNullable(config.selectedValue),
  orientation: config.orientation ?? 'Vertical',
})

// UPDATE

const optionId = (id: string, index: number): string => `${id}-option-${index}`

/** Moves focus to the radio option at the given index. */
export const FocusOption = Command.define('FocusOption', CompletedFocusOption)

/** Processes a radio group message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      SelectedOption: ({ value, index }) => {
        const selector = `#${optionId(model.id, index)}`

        return [
          evo(model, { selectedValue: () => Option.some(value) }),
          [
            FocusOption(
              Task.focus(selector).pipe(
                Effect.ignore,
                Effect.as(CompletedFocusOption()),
              ),
            ),
          ],
        ]
      },
      CompletedFocusOption: () => [model, []],
    }),
  )

/** Programmatically selects a value in the radio group, updating the model and returning
 *  focus commands. Use this in domain-event handlers when the radio group uses `onSelected`. */
export const select = (
  model: Model,
  value: string,
  options: ReadonlyArray<string>,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  pipe(
    options,
    Array.findFirstIndex(option => option === value),
    Option.match({
      onNone: () => [model, []],
      onSome: index => update(model, SelectedOption({ value, index })),
    }),
  )

// VIEW

/** Attribute groups the radio group component provides for each option's `content` callback. */
export type OptionAttributes<Message> = Readonly<{
  option: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  description: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for an individual radio option. The `value` field carries the generic `RadioOption` type
 *  so it flows through to `toParentMessage` callbacks without widening to `string`. */
export type OptionConfig<
  Message,
  RadioOption extends string = string,
> = Readonly<{
  value: RadioOption
  content: (attributes: OptionAttributes<Message>) => Html
}>

/** The `SelectedOption` message as seen by `toParentMessage` callbacks, with `value` narrowed
 *  to the generic `RadioOption` type instead of `string`. */
export type NarrowedSelectedOption<RadioOption extends string> = Readonly<{
  readonly _tag: 'SelectedOption'
  readonly value: RadioOption
  readonly index: number
}>

/** Configuration for rendering a radio group with `view`. */
export type ViewConfig<Message, RadioOption extends string> = Readonly<{
  model: Model
  toParentMessage: (
    message: NarrowedSelectedOption<RadioOption> | CompletedFocusOption,
  ) => Message
  onSelected?: (value: RadioOption, index: number) => Message
  options: ReadonlyArray<RadioOption>
  optionToConfig: (
    option: RadioOption,
    context: Readonly<{
      isSelected: boolean
      isActive: boolean
      isDisabled: boolean
    }>,
  ) => OptionConfig<Message, RadioOption>
  isOptionDisabled?: (option: RadioOption, index: number) => boolean
  orientation?: Orientation
  ariaLabel: string
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
  name?: string
  isDisabled?: boolean
}>

const labelId = (id: string, index: number): string =>
  `${id}-option-${index}-label`

const descriptionId = (id: string, index: number): string =>
  `${id}-option-${index}-description`

/** Renders an accessible radio group by building ARIA attribute groups and delegating layout to the consumer's `optionToConfig` callback. */
export const view = <Message, RadioOption extends string>(
  config: ViewConfig<Message, RadioOption>,
): Html => {
  const {
    div,
    input,
    AriaChecked,
    AriaDescribedBy,
    AriaDisabled,
    AriaLabel,
    AriaLabelledBy,
    AriaOrientation,
    Class,
    DataAttribute,
    Id,
    Name,
    OnClick,
    OnKeyDownPreventDefault,
    Role,
    Tabindex,
    Type,
    Value,
  } = html<Message>()

  const {
    model,
    model: { id, selectedValue },
    toParentMessage,
    onSelected,
    options,
    optionToConfig,
    isOptionDisabled: isOptionDisabledFn,
    orientation = model.orientation,
    ariaLabel,
    className,
    attributes = [],
    name,
    isDisabled: isGroupDisabled = false,
  } = config

  const dispatchSelected = (value: RadioOption, index: number): Message =>
    onSelected
      ? onSelected(value, index)
      : toParentMessage({ _tag: 'SelectedOption', value, index })

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
    Array.findFirstIndex(
      options,
      option =>
        optionToConfig(option, {
          isSelected: false,
          isActive: false,
          isDisabled: false,
        }).value === value,
    ),
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

  const optionValues = Array.map(
    options,
    (option, index) =>
      optionToConfig(option, {
        isSelected: Option.exists(
          selectedIndex,
          selectedIdx => selectedIdx === index,
        ),
        isActive: index === focusedIndex,
        isDisabled: isDisabled(index),
      }).value,
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
    (key: string): Option.Option<Message> =>
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
              optionValues,
              Array.get(nextIndex),
              Option.map(value => dispatchSelected(value, nextIndex)),
            )
          },
        ),
        M.when(' ', () =>
          pipe(
            optionValues,
            Array.get(currentIndex),
            Option.map(value => dispatchSelected(value, currentIndex)),
          ),
        ),
        M.orElse(() => Option.none()),
      )

  const renderedOptions = Array.map(options, (option, index) => {
    const isSelected = Option.exists(
      selectedIndex,
      selectedIdx => selectedIdx === index,
    )
    const isFocusable = index === focusedIndex
    const isOptionDisabled = isDisabled(index)
    const optionConfig = optionToConfig(option, {
      isSelected,
      isActive: isFocusable,
      isDisabled: isOptionDisabled,
    })

    const checkedAttributes = isSelected ? [DataAttribute('checked', '')] : []
    const activeAttributes = isFocusable ? [DataAttribute('active', '')] : []

    const disabledAttributes = isOptionDisabled
      ? [AriaDisabled(true), DataAttribute('disabled', '')]
      : []

    const optionAttributes: ReadonlyArray<Attribute<Message>> = [
      Id(optionId(id, index)),
      Role('radio'),
      AriaChecked(isSelected),
      AriaLabelledBy(labelId(id, index)),
      AriaDescribedBy(descriptionId(id, index)),
      Tabindex(isFocusable ? 0 : -1),
      ...checkedAttributes,
      ...activeAttributes,
      ...disabledAttributes,
      ...(isOptionDisabled
        ? []
        : [
            OnClick(dispatchSelected(optionConfig.value, index)),
            OnKeyDownPreventDefault(handleKeyDown(index)),
          ]),
    ]

    const labelAttributes: ReadonlyArray<Attribute<Message>> = [
      Id(labelId(id, index)),
    ]

    const descriptionAttributes: ReadonlyArray<Attribute<Message>> = [
      Id(descriptionId(id, index)),
    ]

    return optionConfig.content({
      option: optionAttributes,
      label: labelAttributes,
      description: descriptionAttributes,
    })
  })

  const hiddenInputs = pipe(
    name,
    Option.fromNullable,
    Option.flatMap(inputName =>
      pipe(
        selectedValue,
        Option.map(value =>
          input([Type('hidden'), Name(inputName), Value(value)]),
        ),
      ),
    ),
    Option.match({
      onNone: () => [],
      onSome: hiddenInput => [hiddenInput],
    }),
  )

  const groupAttributes = [
    Role('radiogroup'),
    AriaOrientation(String.toLowerCase(orientation)),
    AriaLabel(ariaLabel),
    ...(className ? [Class(className)] : []),
    ...attributes,
  ]

  return div(groupAttributes, [...renderedOptions, ...hiddenInputs])
}

/** Creates a memoized radio group view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message, RadioOption extends string>(
  staticConfig: Omit<
    ViewConfig<Message, RadioOption>,
    'model' | 'toParentMessage' | 'onSelected'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<Message, RadioOption>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message, RadioOption>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}
