import { Array, Option } from 'effect'
import { Ui } from 'foldkit'
import type { AnchorConfig } from 'foldkit/ui/listbox'

import { Class, div, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  GotListboxDemoMessage,
  GotListboxGroupedDemoMessage,
  GotListboxMultiDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const listboxHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'listbox',
  text: 'Listbox',
}

export const singleSelectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'single-select-listbox',
  text: 'Single-Select',
}

export const multiSelectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'multi-select-listbox',
  text: 'Multi-select',
}

export const groupedHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'grouped-listbox',
  text: 'Grouped',
}

// DEMO CONTENT

type ListboxItem =
  | 'Michael Bluth'
  | 'Lindsay Funke'
  | 'Gob Bluth'
  | 'George Michael'
  | 'Maeby Funke'
  | 'Buster Bluth'
  | 'Tobias Funke'
  | 'Lucille Bluth'

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

type Character = Readonly<{
  firstName: string
  lastName: string
}>

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
  'inline-flex items-center justify-between gap-2 min-w-48 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const itemsClassName =
  'absolute mt-1 w-(--button-width) rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg overflow-hidden z-10 outline-none'

const itemClassName =
  'group px-3 py-2 text-base text-gray-700 dark:text-gray-200 cursor-pointer data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700/50'

const groupedItemClassName =
  'group px-3 py-2 text-base text-gray-700 dark:text-gray-200 cursor-pointer data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700/50'

const groupHeadingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500'

const separatorClassName = 'border-t border-gray-200 dark:border-gray-700'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const LISTBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

// VIEW

export const basicDemo = (
  listboxModel: Ui.Listbox.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const buttonLabel = Option.getOrElse(
    listboxModel.maybeSelectedItem,
    () => 'Select a Bluth',
  )

  return [
    div(
      [Class('relative')],
      [
        Ui.Listbox.view({
          model: listboxModel,
          toParentMessage: message =>
            toParentMessage(GotListboxDemoMessage({ message })),
          anchor: LISTBOX_ANCHOR,
          items: LISTBOX_ITEMS,
          itemToConfig: item => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900 dark:text-white',
                ),
                span([], [item]),
              ],
            ),
          }),
          buttonContent: div(
            [Class('flex w-full items-center justify-between gap-4')],
            [span([], [buttonLabel]), Icon.chevronDown('w-4 h-4')],
          ),
          buttonAttributes: [Class(triggerClassName)],
          itemsAttributes: [Class(itemsClassName)],
          backdropAttributes: [Class(backdropClassName)],
          attributes: [Class(wrapperClassName)],
        }),
      ],
    ),
  ]
}

export const multiSelectDemo = (
  listboxModel: Ui.Listbox.Multi.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const { selectedItems } = listboxModel
  const buttonLabel = Array.match(selectedItems, {
    onEmpty: () => 'Select Bluths',
    onNonEmpty: items =>
      items.length === 1 ? items[0] : `${items.length} selected`,
  })

  return [
    div(
      [Class('relative')],
      [
        Ui.Listbox.Multi.view({
          model: listboxModel,
          toParentMessage: message =>
            toParentMessage(GotListboxMultiDemoMessage({ message })),
          anchor: LISTBOX_ANCHOR,
          items: LISTBOX_ITEMS,
          itemToConfig: item => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900 dark:text-white',
                ),
                span([], [item]),
              ],
            ),
          }),
          buttonContent: div(
            [Class('flex w-full items-center justify-between gap-4')],
            [span([], [buttonLabel]), Icon.chevronDown('w-4 h-4')],
          ),
          buttonAttributes: [Class(triggerClassName)],
          itemsAttributes: [Class(itemsClassName)],
          backdropAttributes: [Class(backdropClassName)],
          attributes: [Class(wrapperClassName)],
        }),
      ],
    ),
  ]
}

export const groupedDemo = (
  listboxModel: Ui.Listbox.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const buttonLabel = Option.getOrElse(
    listboxModel.maybeSelectedItem,
    () => 'Select a character',
  )

  return [
    div(
      [Class('relative')],
      [
        Ui.Listbox.view({
          model: listboxModel,
          toParentMessage: message =>
            toParentMessage(GotListboxGroupedDemoMessage({ message })),
          anchor: LISTBOX_ANCHOR,
          items: GROUPED_CHARACTERS,
          itemToValue: characterName,
          itemGroupKey: character => character.lastName,
          groupToHeading: lastName => ({
            content: span([], [`${lastName}s`]),
            className: groupHeadingClassName,
          }),
          separatorAttributes: [Class(separatorClassName)],
          itemToConfig: character => ({
            className: groupedItemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900 dark:text-white',
                ),
                span([], [characterName(character)]),
              ],
            ),
          }),
          buttonContent: div(
            [Class('flex w-full items-center justify-between gap-4')],
            [span([], [buttonLabel]), Icon.chevronDown('w-4 h-4')],
          ),
          buttonAttributes: [Class(triggerClassName)],
          itemsAttributes: [Class(itemsClassName)],
          backdropAttributes: [Class(backdropClassName)],
          attributes: [Class(wrapperClassName)],
        }),
      ],
    ),
  ]
}
