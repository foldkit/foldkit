import { Array, Option } from 'effect'
import { childAttributes } from 'foldkit/html'

import { type AnchorConfig, buttonId } from '@foldkit/ui/listbox'

import { Icon } from '../../../icon'
import type { UiViewBuilder } from '../composition'
import {
  ListboxDemoBinding,
  ListboxGroupedDemoBinding,
  ListboxMultiDemoBinding,
} from '../composition'
import type { ListboxItem } from '../domain/domain'
import {
  type Character,
  ItemListboxBlock,
  ItemMultiListboxBlock,
} from './components'

type ItemListboxBlockModel = typeof ItemListboxBlock.Model.Type
type ItemMultiListboxBlockModel = typeof ItemMultiListboxBlock.Model.Type

// DEMO CONTENT

const LISTBOX_ITEMS: ReadonlyArray<ListboxItem> = [
  'Michael Bluth',
  'Lindsay Funke',
  'Gob Bluth',
  'George Michael',
  'Maeby Funke',
  'Buster Bluth',
  'Tobias Funke',
  'Lucille Bluth',
]

const characterName = (character: Character): string =>
  `${character.firstName} ${character.lastName}`

const GROUPED_CHARACTERS: ReadonlyArray<Character> = [
  { firstName: 'Michael', lastName: 'Bluth' },
  { firstName: 'Gob', lastName: 'Bluth' },
  { firstName: 'George Michael', lastName: 'Bluth' },
  { firstName: 'Buster', lastName: 'Bluth' },
  { firstName: 'Lucille', lastName: 'Bluth' },
  { firstName: 'Lindsay', lastName: 'Funke' },
  { firstName: 'Maeby', lastName: 'Funke' },
  { firstName: 'Tobias', lastName: 'Funke' },
]

const triggerClassName =
  'demo-neutral-button inline-flex min-w-48 items-center justify-between gap-2'

const itemsClassName = 'demo-popup-surface w-(--button-width) overflow-hidden'

const itemClassName = 'demo-option group'

const groupHeadingClassName = 'demo-option-heading'

const separatorClassName = 'border-t border-gray-200 dark:border-gray-700'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const LISTBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

export const basicDemo = (
  listboxModel: ItemListboxBlockModel,
  maybeSelectedItem: Option.Option<ListboxItem>,
  h: UiViewBuilder,
) => {
  const buttonLabel = Option.getOrElse(
    maybeSelectedItem,
    () => 'Select a Bluth',
  )

  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(buttonId(listboxModel.id)), h.Class('demo-label')],
          ['Family member'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.block(
              ListboxDemoBinding.embedView({
                slotId: 'listbox-basic',
                model: listboxModel,
                viewInputs: {
                  anchor: LISTBOX_ANCHOR,
                  items: LISTBOX_ITEMS,
                  maybeSelectedValue: maybeSelectedItem,
                  itemToConfig: item => ({
                    className: itemClassName,
                    content: h.div(
                      [h.Class('flex items-center gap-2')],
                      [
                        Icon.check(
                          'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900 dark:text-white',
                        ),
                        h.span([], [item]),
                      ],
                    ),
                  }),
                  buttonContent: h.div(
                    [h.Class('flex w-full items-center justify-between gap-4')],
                    [h.span([], [buttonLabel]), Icon.chevronDown('w-4 h-4')],
                  ),
                  buttonAttributes: childAttributes([
                    h.Class(triggerClassName),
                  ]),
                  itemsAttributes: childAttributes([h.Class(itemsClassName)]),
                  backdropAttributes: childAttributes([
                    h.Class(backdropClassName),
                  ]),
                  attributes: childAttributes([h.Class(wrapperClassName)]),
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ]
}

export const multiSelectDemo = (
  listboxModel: ItemMultiListboxBlockModel,
  selectedItems: ReadonlyArray<ListboxItem>,
  h: UiViewBuilder,
) => {
  const buttonLabel = Array.match(selectedItems, {
    onEmpty: () => 'Select Bluths',
    onNonEmpty: items =>
      items.length === 1
        ? Array.headNonEmpty(items)
        : `${items.length} selected`,
  })

  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(buttonId(listboxModel.id)), h.Class('demo-label')],
          ['Family members'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.block(
              ListboxMultiDemoBinding.embedView({
                slotId: 'listbox-multi',
                model: listboxModel,
                viewInputs: {
                  anchor: LISTBOX_ANCHOR,
                  items: LISTBOX_ITEMS,
                  selectedValues: selectedItems,
                  itemToConfig: item => ({
                    className: itemClassName,
                    content: h.div(
                      [h.Class('flex items-center gap-2')],
                      [
                        Icon.check(
                          'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900 dark:text-white',
                        ),
                        h.span([], [item]),
                      ],
                    ),
                  }),
                  buttonContent: h.div(
                    [h.Class('flex w-full items-center justify-between gap-4')],
                    [h.span([], [buttonLabel]), Icon.chevronDown('w-4 h-4')],
                  ),
                  buttonAttributes: childAttributes([
                    h.Class(triggerClassName),
                  ]),
                  itemsAttributes: childAttributes([h.Class(itemsClassName)]),
                  backdropAttributes: childAttributes([
                    h.Class(backdropClassName),
                  ]),
                  attributes: childAttributes([h.Class(wrapperClassName)]),
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ]
}

export const groupedDemo = (
  listboxModel: ItemListboxBlockModel,
  maybeSelectedItem: Option.Option<string>,
  h: UiViewBuilder,
) => {
  const buttonLabel = Option.getOrElse(
    maybeSelectedItem,
    () => 'Select a character',
  )

  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(buttonId(listboxModel.id)), h.Class('demo-label')],
          ['Character'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.block(
              ListboxGroupedDemoBinding.embedView({
                slotId: 'listbox-grouped',
                model: listboxModel,
                viewInputs: {
                  anchor: LISTBOX_ANCHOR,
                  items: GROUPED_CHARACTERS,
                  maybeSelectedValue: maybeSelectedItem,
                  itemToValue: characterName,
                  itemGroupKey: character => character.lastName,
                  groupToHeading: lastName => ({
                    content: h.span([], [`${lastName}s`]),
                    className: groupHeadingClassName,
                  }),
                  separatorAttributes: childAttributes([
                    h.Class(separatorClassName),
                  ]),
                  itemToConfig: character => ({
                    className: itemClassName,
                    content: h.div(
                      [h.Class('flex items-center gap-2')],
                      [
                        Icon.check(
                          'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900 dark:text-white',
                        ),
                        h.span([], [characterName(character)]),
                      ],
                    ),
                  }),
                  buttonContent: h.div(
                    [h.Class('flex w-full items-center justify-between gap-4')],
                    [h.span([], [buttonLabel]), Icon.chevronDown('w-4 h-4')],
                  ),
                  buttonAttributes: childAttributes([
                    h.Class(triggerClassName),
                  ]),
                  itemsAttributes: childAttributes([h.Class(itemsClassName)]),
                  backdropAttributes: childAttributes([
                    h.Class(backdropClassName),
                  ]),
                  attributes: childAttributes([h.Class(wrapperClassName)]),
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ]
}
