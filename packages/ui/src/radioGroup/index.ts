import {
  Array,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String,
  pipe,
} from 'effect'
import { type Attribute, type Html, html } from 'foldkit/html'

import { idSelector } from '../internal/selectors.js'
import { keyToIndex } from '../keyboard.js'

// MODEL

/** Controls the radio group layout direction and which arrow keys navigate between options. */
export const Orientation = S.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

// VIEW

const optionId = (id: string, index: number): string => `${id}-option-${index}`

const labelId = (id: string, index: number): string =>
  `${id}-option-${index}-label`

const descriptionId = (id: string, index: number): string =>
  `${id}-option-${index}-description`

/** Per-option render info passed to the consumer's `toView`. The consumer
 *  spreads `option`, `label`, and `description` onto whichever elements carry
 *  that role in their layout. Generic over `Value extends string` so
 *  `option.value` carries the consumer's union type, and over `ParentMessage`
 *  so the attribute bundles dispatch the parent's own Message. */
export type OptionInfo<Value extends string, ParentMessage> = Readonly<{
  value: Value
  index: number
  isSelected: boolean
  isActive: boolean
  isDisabled: boolean
  option: ReadonlyArray<Attribute<ParentMessage>>
  label: ReadonlyArray<Attribute<ParentMessage>>
  description: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `group`: ARIA + role attributes for the wrapping radiogroup element.
 *  - `options`: one entry per option in `options`, in the same order. Includes
 *    the value, derived state, and the attribute bundles for the option
 *    element, its label, and its description.
 *  - `selectedValue`: the currently-selected value, if any. Convenient for the
 *    consumer when rendering selected-state visuals next to the option
 *    attributes.
 *  - `hiddenInput`: when `name` was supplied, attributes for a hidden form
 *    input carrying the selected value. The consumer renders the `<input>`
 *    themselves. Empty array when `name` is undefined. */
export type RenderInfo<Value extends string, ParentMessage> = Readonly<{
  group: ReadonlyArray<Attribute<ParentMessage>>
  options: ReadonlyArray<OptionInfo<Value, ParentMessage>>
  selectedValue: Option.Option<Value>
  hiddenInput: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Per-render view configuration for the stateless controlled {@link view}.
 *  Generic over `Value extends string` (the option union) and `ParentMessage`
 *  (the message `onSelect` dispatches).
 *
 *  - `selectedValue`: the current selection, read straight from the parent
 *    Model. The roving tabindex and checked state derive from it.
 *  - `onSelect`: dispatched with the chosen value when an option is clicked or
 *    navigated to. Handle it in the parent's `update` by storing the value.
 *    The radio group manages focus itself, so the handler needs to do nothing
 *    else.
 *  - `toView`: receives the {@link RenderInfo} and lays out the group. */
export type ViewConfig<Value extends string, ParentMessage> = Readonly<{
  id: string
  selectedValue: Option.Option<Value>
  options: ReadonlyArray<Value>
  onSelect: (value: Value) => ParentMessage
  ariaLabel: string
  toView: (render: RenderInfo<Value, ParentMessage>) => Html
  orientation?: Orientation
  isOptionDisabled?: (value: Value, index: number) => boolean
  isDisabled?: boolean
  name?: string
}>

/** Renders an accessible radio group as a stateless controlled component. The
 *  parent owns the selection (`selectedValue`) and receives the parent's own
 *  Message via `onSelect` when an option is chosen. Moving focus onto the
 *  newly-active option is the radio group's own concern: it happens inside the
 *  component's click and keydown handlers, so the parent's `update` only stores
 *  the value.
 *
 *  ```ts
 *  // In view:
 *  RadioGroup.view<Tool, Message>({
 *    id: TOOL_RADIO_GROUP_ID,
 *    selectedValue: Option.some(model.tool),
 *    options: TOOLS,
 *    ariaLabel: 'Tool',
 *    onSelect: tool => SelectedTool({ tool }),
 *    toView: ({ group, options }) => ...,
 *  })
 *
 *  // In update:
 *  SelectedTool: ({ tool }) => [evo(model, { tool: () => tool }), []],
 *  ``` */
export const view = <Value extends string, ParentMessage>(
  config: ViewConfig<Value, ParentMessage>,
): Html => {
  const h = html<ParentMessage>()

  const {
    id,
    selectedValue,
    options,
    onSelect,
    ariaLabel,
    toView,
    orientation = 'Vertical',
    isOptionDisabled: isOptionDisabledFn,
    isDisabled: isGroupDisabled = false,
    name,
  } = config

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
  const focusedIndex = pipe(
    selectedIndex,
    Option.filter(Predicate.not(isDisabled)),
    Option.getOrElse(() => firstEnabledIndex),
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

  const selectionAt = (
    index: number,
  ): Option.Option<
    Readonly<{ focusSelector: string; message: ParentMessage }>
  > =>
    pipe(
      options,
      Array.get(index),
      Option.map(value => ({
        focusSelector: idSelector(optionId(id, index)),
        message: onSelect(value),
      })),
    )

  const handleKeyDown =
    (currentIndex: number) =>
    (
      key: string,
    ): Option.Option<
      Readonly<{ focusSelector: string; message: ParentMessage }>
    > =>
      M.value(key).pipe(
        M.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => selectionAt(resolveKeyIndex(key)),
        ),
        M.when(' ', () => selectionAt(currentIndex)),
        M.orElse(() => Option.none()),
      )

  const optionInfos: ReadonlyArray<OptionInfo<Value, ParentMessage>> =
    Array.map(options, (value, index) => {
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
              h.OnClickFocus(idSelector(optionId(id, index)), onSelect(value)),
              h.OnKeyDownFocus(handleKeyDown(index)),
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
        option: optionAttributes,
        label: labelAttributes,
        description: descriptionAttributes,
      }
    })

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
    group: groupAttributes,
    options: optionInfos,
    selectedValue,
    hiddenInput: hiddenInputAttributes,
  })
}
