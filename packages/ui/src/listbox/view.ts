import { Array, Function, Match, Option, Predicate, String, pipe } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'

import { groupContiguous } from '../group.js'
import * as OptionExt from '../internal/optionExtensions.js'
import {
  findFirstEnabledIndex,
  isPrintableKey,
  keyToIndex,
} from '../keyboard.js'
import { resolveTypeaheadMatch } from '../typeahead.js'
import { AnchorListbox, PortalListboxBackdrop, mounts } from './command.js'
import { itemId } from './selectors.js'
import type {
  BaseModel,
  BaseViewInputs,
  BaseViewInputsCommon,
  Message,
  MessageSchema,
} from './types.js'

type MountRequirements = Mount.RequirementsOf<typeof mounts>

type ViewBehavior = Readonly<{
  ariaMultiSelectable: boolean
}>

/** @internal Renders the shared Listbox interaction view. */
export const makeView = <
  Model extends BaseModel,
  Item,
  Value extends string,
  ParentMessage = never,
  ValueEncoded = Value,
>(
  behavior: ViewBehavior,
  Message: MessageSchema<Value, ValueEncoded>,
) => {
  const render = <RenderingItem>(
    model: Model,
    viewInputs: BaseViewInputsCommon<RenderingItem> &
      Readonly<{
        selectedValues: ReadonlyArray<Value>
        itemToValue: (item: RenderingItem) => Value
      }>,
    h: HtmlBuilder<Message<Value> | ParentMessage, MountRequirements>,
  ): Html => {
    const {
      id,
      isOpen,
      orientation,
      animation: { transitionState },
      maybeActiveItemIndex,
      searchQuery,
    } = model

    const {
      items,
      itemToConfig,
      isItemDisabled,
      isButtonDisabled,
      buttonContent,
      buttonClassName,
      buttonAttributes = [],
      itemsClassName,
      itemsAttributes = [],
      itemsScrollClassName,
      itemsScrollAttributes = [],
      backdropClassName,
      backdropAttributes = [],
      className,
      attributes = [],
      itemGroupKey,
      groupToHeading,
      groupClassName,
      groupAttributes = [],
      separatorClassName,
      separatorAttributes = [],
      anchor = {},
      name,
      form,
      isDisabled,
      isReadOnly = false,
      isInvalid,
      ariaLabel,
      ariaLabelledBy,
      selectedValues,
    } = viewInputs

    const { itemToValue } = viewInputs
    const isValueSelected = (itemValue: Value): boolean =>
      Array.contains(selectedValues, itemValue)
    const itemToSearchText =
      viewInputs.itemToSearchText ??
      ((item: RenderingItem) => itemToValue(item))

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

    const animationAttributes: ReadonlyArray<
      ReturnType<typeof h.DataAttribute>
    > = Match.value(transitionState).pipe(
      Match.when('EnterStart', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('EnterAnimating', () => [
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveStart', () => [
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveAnimating', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.orElse(() => []),
    )

    const isItemDisabledByIndex = (index: number): boolean =>
      Predicate.isNotUndefined(isItemDisabled) &&
      pipe(
        items,
        Array.get(index),
        Option.exists(item => isItemDisabled(item, index)),
      )

    const isButtonEffectivelyDisabled = isDisabled || isButtonDisabled

    const nextKey = orientation === 'Horizontal' ? 'ArrowRight' : 'ArrowDown'
    const previousKey = orientation === 'Horizontal' ? 'ArrowLeft' : 'ArrowUp'

    const navigationKeys = [
      nextKey,
      previousKey,
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]
    const isNavigationKey = (key: string): boolean =>
      Array.contains(navigationKeys, key)

    const firstEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isItemDisabledByIndex,
    )(0, 1)

    const lastEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isItemDisabledByIndex,
    )(items.length - 1, -1)

    const selectedItemIndex = pipe(
      selectedValues,
      Array.head,
      Option.flatMap(selectedValue =>
        Array.findFirstIndex(
          items,
          item => itemToValue(item) === selectedValue,
        ),
      ),
    )

    const handleButtonKeyDown = (
      key: string,
    ): Option.Option<Message<Value>> => {
      if (isOpen) {
        return handleItemsKeyDown(key)
      }

      return Match.value(key).pipe(
        Match.whenOr('Enter', ' ', 'ArrowDown', () =>
          Option.some(
            Message.Opened({
              maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                Option.some(firstEnabledIndex),
              ),
            }),
          ),
        ),
        Match.when('ArrowUp', () =>
          Option.some(
            Message.Opened({
              maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                Option.some(lastEnabledIndex),
              ),
            }),
          ),
        ),
        Match.orElse(() => Option.none()),
      )
    }

    const handleButtonPointerDown = (
      pointerType: string,
      button: number,
    ): Option.Option<Message<Value>> =>
      Option.some(Message.PressedPointerOnButton({ pointerType, button }))

    const handleSpaceKeyUp = (key: string): Option.Option<Message<Value>> =>
      OptionExt.when(key === ' ', Message.SuppressedSpaceScroll())

    const resolveActiveIndex = (key: string): number =>
      Option.match(maybeActiveItemIndex, {
        onNone: () =>
          Match.value(key).pipe(
            Match.whenOr(
              previousKey,
              'End',
              'PageDown',
              () => lastEnabledIndex,
            ),
            Match.orElse(() => firstEnabledIndex),
          ),
        onSome: activeIndex =>
          keyToIndex(
            nextKey,
            previousKey,
            items.length,
            activeIndex,
            isItemDisabledByIndex,
          )(key),
      })

    const searchForKey = (key: string): Option.Option<Message<Value>> => {
      const nextQuery = searchQuery + key
      const maybeTargetIndex = resolveTypeaheadMatch(
        items,
        nextQuery,
        maybeActiveItemIndex,
        isItemDisabledByIndex,
        itemToSearchText,
        String.isNonEmpty(searchQuery),
      )
      return Option.some(Message.Searched({ key, maybeTargetIndex }))
    }

    const resolveCommitMessage = (): Option.Option<Message<Value>> => {
      if (isReadOnly) {
        return Option.as(maybeActiveItemIndex, Message.SuppressedItemCommit())
      } else {
        return Option.map(maybeActiveItemIndex, index =>
          Message.RequestedItemClick({ index }),
        )
      }
    }

    const handleItemsKeyDown = (key: string): Option.Option<Message<Value>> =>
      Match.value(key).pipe(
        Match.when('Escape', () => Option.some(Message.Closed())),
        Match.when('Enter', resolveCommitMessage),
        Match.when(' ', () =>
          String.isNonEmpty(searchQuery)
            ? searchForKey(' ')
            : resolveCommitMessage(),
        ),
        Match.when(isNavigationKey, () =>
          Option.some(
            Message.ActivatedItem({
              index: resolveActiveIndex(key),
              activationTrigger: 'Keyboard',
            }),
          ),
        ),
        Match.when(isPrintableKey, () => searchForKey(key)),
        Match.orElse(() => Option.none()),
      )

    const resolveButtonLabel = () => {
      if (Predicate.isNotUndefined(ariaLabel)) {
        return [h.AriaLabel(ariaLabel)]
      } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
        return [h.AriaLabelledBy(ariaLabelledBy)]
      } else {
        return []
      }
    }

    const buttonLabelAttributes = resolveButtonLabel()

    const resolvedButtonAttributes = [
      h.Id(`${id}-button`),
      h.Type('button'),
      h.AriaHasPopup('listbox'),
      h.AriaExpanded(isVisible),
      ...(isVisible ? [h.AriaControls(`${id}-items`)] : []),
      ...buttonLabelAttributes,
      ...(isButtonEffectivelyDisabled
        ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
        : [
            h.OnPointerDown(handleButtonPointerDown),
            h.OnKeyDownPreventDefault(handleButtonKeyDown),
            h.OnKeyUpPreventDefault(handleSpaceKeyUp),
            h.OnClick(Message.ClickedButton()),
          ]),
      ...(isVisible
        ? [
            h.DataAttribute('open', ''),
            h.Style({ position: 'relative', zIndex: '1' }),
          ]
        : []),
      ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
      ...(isInvalid ? [h.DataAttribute('invalid', '')] : []),
      ...(buttonClassName ? [h.Class(buttonClassName)] : []),
      ...buttonAttributes,
    ]

    const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
      onNone: () => [],
      onSome: index => [h.AriaActiveDescendant(itemId(id, index))],
    })

    const anchorAttributes = [
      h.Style({
        position: 'absolute',
        margin: '0',
        visibility: 'hidden',
      }),
      h.OnMount(AnchorListbox({ buttonId: `${id}-button`, anchor })),
    ]

    const itemsContainerAttributes = [
      h.Id(`${id}-items`),
      h.Role('listbox'),
      h.AriaOrientation(String.toLowerCase(orientation)),
      ...(behavior.ariaMultiSelectable ? [h.AriaMultiSelectable(true)] : []),
      ...(isReadOnly
        ? [h.AriaReadonly(true), h.DataAttribute('readonly', '')]
        : []),
      h.AriaLabelledBy(`${id}-button`),
      ...maybeActiveDescendant,
      h.Tabindex(-1),
      ...anchorAttributes,
      ...animationAttributes,
      ...(isLeaving
        ? []
        : [
            h.OnKeyDownPreventDefault(handleItemsKeyDown),
            h.OnKeyUpPreventDefault(handleSpaceKeyUp),
            h.OnBlur(Message.BlurredItems()),
          ]),
      ...(itemsClassName ? [h.Class(itemsClassName)] : []),
      ...itemsAttributes,
    ]

    const listboxItems = Array.map(items, (item, index) => {
      const isActiveItem = Option.exists(
        maybeActiveItemIndex,
        activeIndex => activeIndex === index,
      )
      const isDisabledItem = isItemDisabledByIndex(index)
      const isSelectedItem = isValueSelected(itemToValue(item))
      const itemConfig = itemToConfig(item, {
        isActive: isActiveItem,
        isDisabled: isDisabledItem,
        isReadOnly,
        isSelected: isSelectedItem,
      })

      const isHoverable = !isDisabledItem && !isLeaving
      const isClickable = isHoverable && !isReadOnly

      return h.keyed('div')(
        itemId(id, index),
        [
          h.Id(itemId(id, index)),
          h.Role('option'),
          h.AriaSelected(isSelectedItem),
          ...(isActiveItem ? [h.DataAttribute('active', '')] : []),
          ...(isSelectedItem ? [h.DataAttribute('selected', '')] : []),
          ...(isDisabledItem
            ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
            : []),
          ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
          ...(isClickable
            ? [h.OnClick(Message.SelectedItem({ item: itemToValue(item) }))]
            : []),
          ...(isHoverable
            ? [
                ...(isActiveItem
                  ? []
                  : [
                      h.OnPointerMove((screenX, screenY, pointerType) =>
                        OptionExt.when(
                          pointerType !== 'touch',
                          Message.MovedPointerOverItem({
                            index,
                            screenX,
                            screenY,
                          }),
                        ),
                      ),
                    ]),
                h.OnPointerLeave(pointerType =>
                  OptionExt.when(
                    pointerType !== 'touch',
                    Message.DeactivatedItem(),
                  ),
                ),
              ]
            : []),
          ...(itemConfig.className ? [h.Class(itemConfig.className)] : []),
        ],
        [itemConfig.content],
      )
    })

    const renderGroupedItems = (): ReadonlyArray<Html> => {
      if (!itemGroupKey) {
        return listboxItems
      }

      const segments = groupContiguous(listboxItems, (_, index) =>
        Array.get(items, index).pipe(
          Option.match({
            onNone: () => '',
            onSome: item => itemGroupKey(item, index),
          }),
        ),
      )

      return Array.flatMap(segments, (segment, segmentIndex) => {
        const maybeHeading = Option.fromNullishOr(groupToHeading?.(segment.key))

        const headingId = `${id}-heading-${segment.key}`

        const headingElement = Option.match(maybeHeading, {
          onNone: () => [],
          onSome: heading => [
            h.keyed('div')(
              headingId,
              [
                h.Id(headingId),
                h.Role('presentation'),
                ...(heading.className ? [h.Class(heading.className)] : []),
              ],
              [heading.content],
            ),
          ],
        })

        const groupContent = [...headingElement, ...segment.items]

        const groupElement = h.keyed('div')(
          `${id}-group-${segment.key}`,
          [
            h.Role('group'),
            ...(Option.isSome(maybeHeading)
              ? [h.AriaLabelledBy(headingId)]
              : []),
            ...(groupClassName ? [h.Class(groupClassName)] : []),
            ...groupAttributes,
          ],
          groupContent,
        )

        const separator =
          segmentIndex > 0 &&
          (separatorClassName ||
            Array.isReadonlyArrayNonEmpty(separatorAttributes))
            ? [
                h.keyed('div')(`${id}-separator-${segmentIndex}`, [
                  h.Role('separator'),
                  ...(separatorClassName ? [h.Class(separatorClassName)] : []),
                  ...separatorAttributes,
                ]),
              ]
            : []

        return [...separator, groupElement]
      })
    }

    const backdrop = h.keyed('div')(`${id}-backdrop`, [
      h.OnMount(PortalListboxBackdrop()),
      ...(isLeaving ? [] : [h.OnClick(Message.Closed())]),
      ...(backdropClassName ? [h.Class(backdropClassName)] : []),
      ...backdropAttributes,
    ])

    const renderedItems = renderGroupedItems()

    const scrollableItems =
      itemsScrollClassName ||
      Array.isReadonlyArrayNonEmpty(itemsScrollAttributes)
        ? [
            h.div(
              [
                ...(itemsScrollClassName
                  ? [h.Class(itemsScrollClassName)]
                  : []),
                ...itemsScrollAttributes,
              ],
              renderedItems,
            ),
          ]
        : renderedItems

    const visibleContent = [
      backdrop,
      h.keyed('div')(
        `${id}-items-container`,
        itemsContainerAttributes,
        scrollableItems,
      ),
    ]

    const formAttribute = form ? [h.Attribute('form', form)] : []

    const hiddenInputs = name
      ? Array.match(selectedValues, {
          onEmpty: () => [
            h.input([h.Type('hidden'), h.Name(name), ...formAttribute]),
          ],
          onNonEmpty: Array.map(selectedValue =>
            h.input([
              h.Type('hidden'),
              h.Name(name),
              h.Value(selectedValue),
              ...formAttribute,
            ]),
          ),
        })
      : []

    const wrapperAttributes = [
      ...(className ? [h.Class(className)] : []),
      ...attributes,
      ...(isVisible ? [h.DataAttribute('open', '')] : []),
      ...(isDisabled ? [h.DataAttribute('disabled', '')] : []),
      ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
      ...(isInvalid ? [h.DataAttribute('invalid', '')] : []),
    ]

    return h.div(wrapperAttributes, [
      h.keyed('button')(`${id}-button`, resolvedButtonAttributes, [
        buttonContent,
      ]),
      ...hiddenInputs,
      ...(isVisible ? visibleContent : []),
    ])
  }

  return (
    model: Model,
    viewInputs: BaseViewInputs<Item, Value>,
    h: HtmlBuilder<Message<Value> | ParentMessage, MountRequirements>,
  ): Html => {
    if (viewInputs.itemToValue === undefined) {
      return render<Item & Value>(
        model,
        {
          ...viewInputs,
          itemToValue: Function.identity,
        },
        h,
      )
    } else {
      return render<Item>(model, viewInputs, h)
    }
  }
}
