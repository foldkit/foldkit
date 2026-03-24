import { clsx } from 'clsx'
import { Array } from 'effect'
import { Ui } from 'foldkit'
import type { AnchorConfig } from 'foldkit/ui/combobox'

import { Class, Placeholder, div, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading, inlineCode, subPara } from '../../prose'
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

// VIEW

export const comboboxDemo = (
  comboboxModel: Ui.Combobox.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const filteredCities = filterCities(comboboxModel.inputValue)

  return [
    heading('h3', singleSelectHeader.id, singleSelectHeader.text),
    div(
      [Class('relative')],
      [
        Ui.Combobox.view({
          model: comboboxModel,
          toParentMessage: message =>
            toParentMessage(GotComboboxDemoMessage({ message })),
          items: filteredCities,
          itemToConfig: (city, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  clsx('w-4 h-4 shrink-0 text-gray-900 dark:text-white', {
                    visible: context.isSelected,
                    invisible: !context.isSelected,
                  }),
                ),
                span([], [city]),
              ],
            ),
          }),
          itemToValue: city => city,
          itemToDisplayText: city => city,
          inputAttributes: [
            Class(inputClassName),
            Placeholder('Search cities...'),
          ],
          itemsAttributes: [Class(itemsClassName)],
          backdropAttributes: [Class(backdropClassName)],
          attributes: [Class(wrapperClassName)],
          inputWrapperAttributes: [Class('relative')],
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonAttributes: [Class(buttonClassName)],
          anchor: COMBOBOX_ANCHOR,
        }),
      ],
    ),
  ]
}

export const nullableDemo = (
  comboboxNullableModel: Ui.Combobox.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const filteredCities = filterCities(comboboxNullableModel.inputValue)

  return [
    heading('h3', nullableHeader.id, nullableHeader.text),
    div(
      [Class('relative')],
      [
        Ui.Combobox.view({
          model: comboboxNullableModel,
          toParentMessage: message =>
            toParentMessage(GotComboboxNullableDemoMessage({ message })),
          items: filteredCities,
          itemToConfig: (city, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  clsx('w-4 h-4 shrink-0 text-gray-900 dark:text-white', {
                    visible: context.isSelected,
                    invisible: !context.isSelected,
                  }),
                ),
                span([], [city]),
              ],
            ),
          }),
          itemToValue: city => city,
          itemToDisplayText: city => city,
          inputAttributes: [
            Class(inputClassName),
            Placeholder('Search cities...'),
          ],
          itemsAttributes: [Class(itemsClassName)],
          backdropAttributes: [Class(backdropClassName)],
          attributes: [Class(wrapperClassName)],
          inputWrapperAttributes: [Class('relative')],
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonAttributes: [Class(buttonClassName)],
          anchor: COMBOBOX_ANCHOR,
        }),
      ],
    ),
  ]
}

export const selectOnFocusDemo = (
  comboboxSelectOnFocusModel: Ui.Combobox.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const filteredCities = filterCities(comboboxSelectOnFocusModel.inputValue)

  return [
    heading('h3', selectOnFocusHeader.id, selectOnFocusHeader.text),
    subPara(
      'Pass ',
      inlineCode('selectInputOnFocus: true', 'text-xs px-0.5'),
      ' to highlight the input text when the combobox receives focus. Typing immediately replaces the current value, making it easy to start a new search without manually clearing the input.',
    ),
    div(
      [Class('relative')],
      [
        Ui.Combobox.view({
          model: comboboxSelectOnFocusModel,
          toParentMessage: message =>
            toParentMessage(GotComboboxSelectOnFocusDemoMessage({ message })),
          items: filteredCities,
          itemToConfig: (city, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  clsx('w-4 h-4 shrink-0 text-gray-900 dark:text-white', {
                    visible: context.isSelected,
                    invisible: !context.isSelected,
                  }),
                ),
                span([], [city]),
              ],
            ),
          }),
          itemToValue: city => city,
          itemToDisplayText: city => city,
          inputAttributes: [
            Class(inputClassName),
            Placeholder('Search cities...'),
          ],
          itemsAttributes: [Class(itemsClassName)],
          backdropAttributes: [Class(backdropClassName)],
          attributes: [Class(wrapperClassName)],
          inputWrapperAttributes: [Class('relative')],
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonAttributes: [Class(buttonClassName)],
          anchor: COMBOBOX_ANCHOR,
        }),
      ],
    ),
  ]
}

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'

const emptyTagClassName = 'text-sm py-0.5 text-gray-400 dark:text-gray-500'

export const multiDemo = (
  comboboxMultiModel: Ui.Combobox.Multi.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const filteredCities = filterCities(comboboxMultiModel.inputValue)

  return [
    heading('h3', multiHeader.id, multiHeader.text),
    div(
      [Class('relative')],
      [
        div(
          [Class('flex flex-wrap gap-1.5 mb-2')],
          Array.match(comboboxMultiModel.selectedItems, {
            onEmpty: () => [span([Class(emptyTagClassName)], ['No selection'])],
            onNonEmpty: selectedItems =>
              selectedItems.map(item => span([Class(tagClassName)], [item])),
          }),
        ),
        Ui.Combobox.Multi.view({
          model: comboboxMultiModel,
          toParentMessage: message =>
            toParentMessage(GotComboboxMultiDemoMessage({ message })),
          items: filteredCities,
          itemToConfig: (city, context) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2')],
              [
                Icon.check(
                  clsx('w-4 h-4 shrink-0 text-gray-900 dark:text-white', {
                    visible: context.isSelected,
                    invisible: !context.isSelected,
                  }),
                ),
                span([], [city]),
              ],
            ),
          }),
          itemToValue: city => city,
          itemToDisplayText: city => city,
          inputAttributes: [
            Class(inputClassName),
            Placeholder('Search cities...'),
          ],
          itemsAttributes: [Class(itemsClassName)],
          backdropAttributes: [Class(backdropClassName)],
          attributes: [Class(wrapperClassName)],
          inputWrapperAttributes: [Class('relative')],
          buttonContent: Icon.chevronDown('w-4 h-4'),
          buttonAttributes: [Class(buttonClassName)],
          anchor: COMBOBOX_ANCHOR,
        }),
      ],
    ),
  ]
}
