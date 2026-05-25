import { clsx } from 'clsx'
import { Array } from 'effect'
import { Ui } from 'foldkit'
import { childAttributes, html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/combobox'

import { Icon } from '../../icon'
import type { TableOfContentsEntry } from '../../main'
import { inlineCode, subPara } from '../../prose'
import {
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const comboboxHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'combobox',
  text: 'Combobox',
}

export const singleSelectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-single-select',
  text: 'Single-Select',
}

export const nullableHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-nullable',
  text: 'Nullable',
}

export const selectOnFocusHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-select-on-focus',
  text: 'Select on Focus',
}

export const multiHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox-multi',
  text: 'Multi-Select',
}

// DEMO CONTENT

type City =
  | 'Johannesburg'
  | 'Kyiv'
  | 'Oxford'
  | 'Plymouth'
  | 'Quito'
  | 'Wellington'
  | 'Zurich'

export const CityCombobox = Ui.Combobox.create<City>()
export const CityMultiCombobox = Ui.Combobox.Multi.create<City>()

const CITIES: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
]

const inputClassName =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white pl-3 pr-10 py-2 text-base outline-none focus:ring-2 focus:ring-accent-500'

const buttonClassName =
  'absolute inset-y-0 right-0 flex items-center px-4 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors'

const itemsClassName =
  'w-(--button-width) rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg overflow-hidden z-10 outline-none'

const COMBOBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 8,
  padding: 8,
}

const itemClassName =
  'px-3 py-2 text-base text-gray-700 dark:text-gray-200 cursor-pointer data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700/50 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative w-72'

const filterCities = (inputValue: string): ReadonlyArray<City> =>
  inputValue === ''
    ? CITIES
    : Array.filter(CITIES, city =>
        city.toLowerCase().includes(inputValue.toLowerCase()),
      )

const comboboxViewInputs = (
  inputValue: string,
): Ui.Combobox.ViewInputs<City> => {
  const h = html<Message>()
  const filteredCities = filterCities(inputValue)

  return {
    items: filteredCities,
    itemToConfig: (city, context) => ({
      className: itemClassName,
      content: h.div(
        [h.Class('flex items-center gap-2')],
        [
          Icon.check(
            clsx('w-4 h-4 shrink-0 text-gray-900 dark:text-white', {
              visible: context.isSelected,
              invisible: !context.isSelected,
            }),
          ),
          h.span([], [city]),
        ],
      ),
    }),
    itemToValue: city => city,
    itemToDisplayText: city => city,
    inputAttributes: childAttributes([
      h.Class(inputClassName),
      h.Placeholder('Search cities...'),
    ]),
    itemsAttributes: childAttributes([h.Class(itemsClassName)]),
    backdropAttributes: childAttributes([h.Class(backdropClassName)]),
    attributes: childAttributes([h.Class(wrapperClassName)]),
    inputWrapperAttributes: childAttributes([h.Class('relative')]),
    buttonContent: Icon.chevronDown('w-4 h-4'),
    buttonAttributes: childAttributes([h.Class(buttonClassName)]),
    anchor: COMBOBOX_ANCHOR,
  }
}

// VIEW

export const comboboxDemo = (comboboxModel: Ui.Combobox.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('relative')],
      [
        h.submodel({
          slotId: comboboxModel.id,
          model: comboboxModel,
          view: CityCombobox.view,
          viewInputs: comboboxViewInputs(comboboxModel.inputValue),
          toParentMessage: message => GotComboboxDemoMessage({ message }),
        }),
      ],
    ),
  ]
}

export const nullableDemo = (comboboxNullableModel: Ui.Combobox.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('relative')],
      [
        h.submodel({
          slotId: comboboxNullableModel.id,
          model: comboboxNullableModel,
          view: CityCombobox.view,
          viewInputs: comboboxViewInputs(comboboxNullableModel.inputValue),
          toParentMessage: message =>
            GotComboboxNullableDemoMessage({ message }),
        }),
      ],
    ),
  ]
}

export const selectOnFocusDemo = (
  comboboxSelectOnFocusModel: Ui.Combobox.Model,
) => {
  const h = html<Message>()

  return [
    subPara(
      'Pass ',
      inlineCode('selectInputOnFocus: true', 'text-xs px-0.5'),
      ' to highlight the input text when the combobox receives focus. Typing immediately replaces the current value, making it easy to start a new search without manually clearing the input.',
    ),
    h.div(
      [h.Class('relative')],
      [
        h.submodel({
          slotId: comboboxSelectOnFocusModel.id,
          model: comboboxSelectOnFocusModel,
          view: CityCombobox.view,
          viewInputs: comboboxViewInputs(comboboxSelectOnFocusModel.inputValue),
          toParentMessage: message =>
            GotComboboxSelectOnFocusDemoMessage({ message }),
        }),
      ],
    ),
  ]
}

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'

const emptyTagClassName = 'text-sm py-0.5 text-gray-400 dark:text-gray-500'

export const multiDemo = (comboboxMultiModel: Ui.Combobox.Multi.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('relative')],
      [
        h.div(
          [h.Class('flex flex-wrap gap-1.5 mb-2')],
          Array.match(comboboxMultiModel.selectedItems, {
            onEmpty: () => [
              h.span([h.Class(emptyTagClassName)], ['No selection']),
            ],
            onNonEmpty: selectedItems =>
              selectedItems.map(item =>
                h.span([h.Class(tagClassName)], [item]),
              ),
          }),
        ),
        h.submodel({
          slotId: comboboxMultiModel.id,
          model: comboboxMultiModel,
          view: CityMultiCombobox.view,
          viewInputs: comboboxViewInputs(comboboxMultiModel.inputValue),
          toParentMessage: message => GotComboboxMultiDemoMessage({ message }),
        }),
      ],
    ),
  ]
}
