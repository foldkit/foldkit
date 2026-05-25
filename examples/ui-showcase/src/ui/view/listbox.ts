import { Array, Option } from 'effect'
import { Submodel, Ui } from 'foldkit'
import { Html, childAttributes, html } from 'foldkit/html'

import * as Icon from '../../icon'
import {
  GotListboxDemoMessage,
  GotListboxGroupedDemoMessage,
  GotListboxMultiDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

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

export const ItemListbox = Ui.Listbox.create<ListboxItem>()
export const ItemMultiListbox = Ui.Listbox.Multi.create<ListboxItem>()
export const CharacterListbox = Ui.Listbox.create<Character>()

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
  'inline-flex items-center justify-between gap-2 min-w-48 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const itemsClassName =
  'absolute mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none'

const itemClassName =
  'group px-3 py-2 text-base text-gray-700 cursor-pointer data-[active]:bg-gray-100'

const groupHeadingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400'

const separatorClassName = 'border-t border-gray-200'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const LISTBOX_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 4,
  padding: 8,
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  const singleButtonLabel = Option.getOrElse(
    model.listboxDemo.maybeSelectedItem,
    () => 'Select a Bluth',
  )

  const multiButtonLabel = Array.match(model.listboxMultiDemo.selectedItems, {
    onEmpty: () => 'Select Bluths',
    onNonEmpty: items =>
      items.length === 1 ? items[0] : `${items.length} selected`,
  })

  const groupedButtonLabel = Option.getOrElse(
    model.listboxGroupedDemo.maybeSelectedItem,
    () => 'Select a character',
  )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Listbox']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Single-Select'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: 'listbox-single',
            model: model.listboxDemo,
            view: ItemListbox.view,
            viewInputs: {
              anchor: LISTBOX_ANCHOR,
              items: LISTBOX_ITEMS,
              itemToConfig: item => ({
                className: itemClassName,
                content: h.div(
                  [h.Class('flex items-center gap-2')],
                  [
                    Icon.check(
                      'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900',
                    ),
                    h.span([], [item]),
                  ],
                ),
              }),
              buttonContent: h.div(
                [h.Class('flex w-full items-center justify-between gap-4')],
                [h.span([], [singleButtonLabel]), Icon.chevronDown('w-4 h-4')],
              ),
              buttonAttributes: childAttributes([h.Class(triggerClassName)]),
              itemsAttributes: childAttributes([h.Class(itemsClassName)]),
              backdropAttributes: childAttributes([h.Class(backdropClassName)]),
              attributes: childAttributes([h.Class(wrapperClassName)]),
            },
            toParentMessage: message => GotListboxDemoMessage({ message }),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Multi-Select'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: 'listbox-multi',
            model: model.listboxMultiDemo,
            view: ItemMultiListbox.view,
            viewInputs: {
              anchor: LISTBOX_ANCHOR,
              items: LISTBOX_ITEMS,
              itemToConfig: item => ({
                className: itemClassName,
                content: h.div(
                  [h.Class('flex items-center gap-2')],
                  [
                    Icon.check(
                      'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900',
                    ),
                    h.span([], [item]),
                  ],
                ),
              }),
              buttonContent: h.div(
                [h.Class('flex w-full items-center justify-between gap-4')],
                [h.span([], [multiButtonLabel]), Icon.chevronDown('w-4 h-4')],
              ),
              buttonAttributes: childAttributes([h.Class(triggerClassName)]),
              itemsAttributes: childAttributes([h.Class(itemsClassName)]),
              backdropAttributes: childAttributes([h.Class(backdropClassName)]),
              attributes: childAttributes([h.Class(wrapperClassName)]),
            },
            toParentMessage: message => GotListboxMultiDemoMessage({ message }),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Grouped'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: 'listbox-grouped',
            model: model.listboxGroupedDemo,
            view: CharacterListbox.view,
            viewInputs: {
              anchor: LISTBOX_ANCHOR,
              items: GROUPED_CHARACTERS,
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
                      'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900',
                    ),
                    h.span([], [characterName(character)]),
                  ],
                ),
              }),
              buttonContent: h.div(
                [h.Class('flex w-full items-center justify-between gap-4')],
                [h.span([], [groupedButtonLabel]), Icon.chevronDown('w-4 h-4')],
              ),
              buttonAttributes: childAttributes([h.Class(triggerClassName)]),
              itemsAttributes: childAttributes([h.Class(itemsClassName)]),
              backdropAttributes: childAttributes([h.Class(backdropClassName)]),
              attributes: childAttributes([h.Class(wrapperClassName)]),
            },
            toParentMessage: message =>
              GotListboxGroupedDemoMessage({ message }),
          }),
        ],
      ),
    ],
  )
})
