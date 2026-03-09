import { Array } from 'effect'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, h2, h3, span } from '../html'
import * as Icon from '../icon'
import type { Message as ParentMessage } from '../main'
import {
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

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
  'w-full rounded-lg border border-gray-300 bg-white text-gray-900 pl-3 pr-10 py-2 text-base outline-none focus:ring-2 focus:ring-accent-500'

const buttonClassName =
  'absolute inset-y-0 right-0 flex items-center px-4 cursor-pointer text-gray-400 hover:text-gray-900 transition-colors'

const itemsClassName =
  'w-(--button-width) rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none'

const COMBOBOX_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 8,
  padding: 8,
}

const itemClassName =
  'px-3 py-2 text-base text-gray-700 cursor-pointer data-[active]:bg-gray-100 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative w-72'

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 text-gray-700'

const emptyTagClassName = 'text-sm py-0.5 text-gray-400'

const filterCities = (inputValue: string): ReadonlyArray<City> =>
  inputValue === ''
    ? CITIES
    : Array.filter(CITIES, city =>
        city.toLowerCase().includes(inputValue.toLowerCase()),
      )

const comboboxConfig = (
  model: Ui.Combobox.Model,
  toMessage: (message: Ui.Combobox.Message) => ParentMessage,
) => {
  const filteredCities = filterCities(model.inputValue)

  return {
    model,
    toMessage,
    items: filteredCities,
    itemToConfig: (city: City, context: { isSelected: boolean }) => ({
      className: itemClassName,
      content: div(
        [Class('flex items-center gap-2')],
        [
          Icon.check(
            `w-4 h-4 shrink-0 text-gray-900 ${context.isSelected ? 'visible' : 'invisible'}`,
          ),
          span([], [city]),
        ],
      ),
    }),
    itemToValue: (city: City) => city,
    itemToDisplayText: (city: City) => city,
    inputClassName,
    inputPlaceholder: 'Search cities...',
    itemsClassName,
    backdropClassName,
    className: wrapperClassName,
    inputWrapperClassName: 'relative',
    buttonContent: Icon.chevronDown('w-4 h-4'),
    buttonClassName,
    anchor: COMBOBOX_ANCHOR,
  }
}

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Combobox']),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Single-Select'],
      ),
      div(
        [Class('relative')],
        [
          Ui.Combobox.view(
            comboboxConfig(model.comboboxDemo, message =>
              toMessage(GotComboboxDemoMessage({ message })),
            ),
          ),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Nullable'],
      ),
      div(
        [Class('relative')],
        [
          Ui.Combobox.view(
            comboboxConfig(model.comboboxNullableDemo, message =>
              toMessage(GotComboboxNullableDemoMessage({ message })),
            ),
          ),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Select on Focus'],
      ),
      div(
        [Class('relative')],
        [
          Ui.Combobox.view(
            comboboxConfig(model.comboboxSelectOnFocusDemo, message =>
              toMessage(GotComboboxSelectOnFocusDemoMessage({ message })),
            ),
          ),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Multi-Select'],
      ),
      div(
        [Class('relative')],
        [
          div(
            [Class('flex flex-wrap gap-1.5 mb-2')],
            Array.match(model.comboboxMultiDemo.selectedItems, {
              onEmpty: () => [
                span([Class(emptyTagClassName)], ['No selection']),
              ],
              onNonEmpty: selectedItems =>
                selectedItems.map(item => span([Class(tagClassName)], [item])),
            }),
          ),
          Ui.Combobox.Multi.view({
            model: model.comboboxMultiDemo,
            toMessage: message =>
              toMessage(GotComboboxMultiDemoMessage({ message })),
            items: filterCities(model.comboboxMultiDemo.inputValue),
            itemToConfig: (city: City, context: { isSelected: boolean }) => ({
              className: itemClassName,
              content: div(
                [Class('flex items-center gap-2')],
                [
                  Icon.check(
                    `w-4 h-4 shrink-0 text-gray-900 ${context.isSelected ? 'visible' : 'invisible'}`,
                  ),
                  span([], [city]),
                ],
              ),
            }),
            itemToValue: (city: City) => city,
            itemToDisplayText: (city: City) => city,
            inputClassName,
            inputPlaceholder: 'Search cities...',
            itemsClassName,
            backdropClassName,
            className: wrapperClassName,
            inputWrapperClassName: 'relative',
            buttonContent: Icon.chevronDown('w-4 h-4'),
            buttonClassName,
            anchor: COMBOBOX_ANCHOR,
          }),
        ],
      ),
    ],
  )
