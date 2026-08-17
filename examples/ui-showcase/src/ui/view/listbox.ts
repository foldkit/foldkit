import { Array, Option } from 'effect'
import { Submodel } from 'foldkit'
import { type Html, type HtmlBuilder, childAttributes } from 'foldkit/html'

import { Listbox } from '@foldkit/ui'

import * as Icon from '../../icon'
import {
  GotListboxDemoMessage,
  GotListboxGroupedDemoMessage,
  GotListboxMultiDemoMessage,
  type UiMessage,
} from '../message'
import type { ListboxItem, UiModel } from '../model'

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

export const ItemListbox = Listbox.create<ListboxItem>()
export const ItemMultiListbox = Listbox.Multi.create<ListboxItem>()
export const CharacterListbox = Listbox.create<Character>()

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
  'w-56 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none'

const itemClassName =
  'group px-3 py-2 text-base text-gray-700 cursor-pointer data-[active]:bg-gray-100'

const groupHeadingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400'

const separatorClassName = 'border-t border-gray-200'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const labelClassName = 'block text-sm font-medium text-gray-700'

const fieldClassName = 'flex flex-col gap-1.5 items-start'

const checkIconClassName =
  'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900'

const buttonContentClassName = 'flex w-full items-center justify-between gap-4'

const sectionHeadingClassName = 'text-lg font-semibold text-gray-900 mt-8 mb-4'

const LISTBOX_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 4,
  padding: 8,
}

// PIECES

const itemContent = (label: string, h: HtmlBuilder<UiMessage>): Html =>
  h.div(
    [h.Class('flex items-center gap-2')],
    [Icon.check(checkIconClassName), h.span([], [label])],
  )

const buttonContent = (label: string, h: HtmlBuilder<UiMessage>): Html =>
  h.div(
    [h.Class(buttonContentClassName)],
    [h.span([], [label]), Icon.chevronDown('w-4 h-4')],
  )

const chromeAttributes = (h: HtmlBuilder<UiMessage>) => ({
  buttonAttributes: childAttributes([h.Class(triggerClassName)]),
  itemsAttributes: childAttributes([h.Class(itemsClassName)]),
  backdropAttributes: childAttributes([h.Class(backdropClassName)]),
  attributes: childAttributes([h.Class(wrapperClassName)]),
})

const field = (
  buttonId: string,
  label: string,
  listbox: Html,
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.div(
    [h.Class(fieldClassName)],
    [
      h.label([h.For(buttonId), h.Class(labelClassName)], [label]),
      h.div([h.Class('relative')], [listbox]),
    ],
  )

// DEMOS

const singleSelectDemo = (
  listboxModel: Listbox.Model,
  maybeSelectedItem: Option.Option<ListboxItem>,
  h: HtmlBuilder<UiMessage>,
): Html => {
  const buttonLabel = Option.getOrElse(
    maybeSelectedItem,
    () => 'Select a Bluth',
  )

  return field(
    Listbox.buttonId(listboxModel.id),
    'Family member',
    h.submodel({
      slotId: 'listbox-single',
      model: listboxModel,
      view: ItemListbox.view,
      viewInputs: {
        anchor: LISTBOX_ANCHOR,
        items: LISTBOX_ITEMS,
        maybeSelectedValue: maybeSelectedItem,
        itemToConfig: item => ({
          className: itemClassName,
          content: itemContent(item, h),
        }),
        buttonContent: buttonContent(buttonLabel, h),
        ...chromeAttributes(h),
      },
      toParentMessage: message => GotListboxDemoMessage({ message }),
    }),
    h,
  )
}

const multiSelectDemo = (
  listboxModel: Listbox.Multi.Model,
  selectedItems: ReadonlyArray<ListboxItem>,
  h: HtmlBuilder<UiMessage>,
): Html => {
  const buttonLabel = Array.match(selectedItems, {
    onEmpty: () => 'Select Bluths',
    onNonEmpty: items =>
      items.length === 1
        ? Array.headNonEmpty(items)
        : `${items.length} selected`,
  })

  return field(
    Listbox.Multi.buttonId(listboxModel.id),
    'Family members',
    h.submodel({
      slotId: 'listbox-multi',
      model: listboxModel,
      view: ItemMultiListbox.view,
      viewInputs: {
        anchor: LISTBOX_ANCHOR,
        items: LISTBOX_ITEMS,
        selectedValues: selectedItems,
        itemToConfig: item => ({
          className: itemClassName,
          content: itemContent(item, h),
        }),
        buttonContent: buttonContent(buttonLabel, h),
        ...chromeAttributes(h),
      },
      toParentMessage: message => GotListboxMultiDemoMessage({ message }),
    }),
    h,
  )
}

const groupedDemo = (
  listboxModel: Listbox.Model,
  maybeSelectedItem: Option.Option<string>,
  h: HtmlBuilder<UiMessage>,
): Html => {
  const buttonLabel = Option.getOrElse(
    maybeSelectedItem,
    () => 'Select a character',
  )

  return field(
    Listbox.buttonId(listboxModel.id),
    'Character',
    h.submodel({
      slotId: 'listbox-grouped',
      model: listboxModel,
      view: CharacterListbox.view,
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
        separatorAttributes: childAttributes([h.Class(separatorClassName)]),
        itemToConfig: character => ({
          className: itemClassName,
          content: itemContent(characterName(character), h),
        }),
        buttonContent: buttonContent(buttonLabel, h),
        ...chromeAttributes(h),
      },
      toParentMessage: message => GotListboxGroupedDemoMessage({ message }),
    }),
    h,
  )
}

// VIEW

export const view = Submodel.defineView<UiModel, UiMessage>(
  (model, h): Html => {
    return h.div(
      [],
      [
        h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Listbox']),

        h.h3([h.Class(sectionHeadingClassName)], ['Single-Select']),
        singleSelectDemo(
          model.listboxDemo,
          model.maybeListboxDemoSelectedItem,
          h,
        ),

        h.h3([h.Class(sectionHeadingClassName)], ['Multi-Select']),
        multiSelectDemo(
          model.listboxMultiDemo,
          model.listboxMultiDemoSelectedItems,
          h,
        ),

        h.h3([h.Class(sectionHeadingClassName)], ['Grouped']),
        groupedDemo(
          model.listboxGroupedDemo,
          model.maybeListboxGroupedDemoSelectedItem,
          h,
        ),
      ],
    )
  },
)
