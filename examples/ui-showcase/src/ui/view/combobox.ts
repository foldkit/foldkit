import clsx from 'clsx'
import { Array, Option } from 'effect'
import { Submodel } from 'foldkit'
import { Html, childAttributes, html } from 'foldkit/html'

import { Combobox } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/combobox'

import * as Icon from '../../icon'
import {
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  type UiMessage,
} from '../message'
import type { City, UiModel } from '../model'

export const CityCombobox = Combobox.create<City>()
export const CityMultiCombobox = Combobox.Multi.create<City>()

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

const wrapperClassName = 'relative w-full max-w-72'

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 text-gray-700'

const emptyTagClassName = 'text-sm py-0.5 text-gray-400'

const filterCities = (inputValue: string): ReadonlyArray<City> =>
  inputValue === ''
    ? CITIES
    : Array.filter(CITIES, city =>
        city.toLowerCase().includes(inputValue.toLowerCase()),
      )

export const comboboxInputs = ({
  inputValue,
  restingInputValue,
  anchor = COMBOBOX_ANCHOR,
  wrapperClass = wrapperClassName,
}: Readonly<{
  inputValue: string
  restingInputValue: string
  anchor?: AnchorConfig
  wrapperClass?: string
}>): Omit<Combobox.ViewInputs<City>, 'maybeSelectedValue'> => {
  const h = html<UiMessage>()
  const filteredCities = filterCities(inputValue)

  return {
    items: filteredCities,
    restingInputValue,
    itemToConfig: (city, context) => ({
      className: itemClassName,
      content: h.div(
        [h.Class('flex items-center gap-2')],
        [
          Icon.check(
            clsx(
              'w-4 h-4 shrink-0 text-gray-900',
              context.isSelected ? 'visible' : 'invisible',
            ),
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
    attributes: childAttributes([h.Class(wrapperClass)]),
    inputWrapperAttributes: childAttributes([h.Class('relative')]),
    buttonContent: Icon.chevronDown('w-4 h-4'),
    buttonAttributes: childAttributes([h.Class(buttonClassName)]),
    anchor,
  }
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Combobox']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Single-Select'],
      ),
      h.label(
        [
          h.For(Combobox.inputId(model.comboboxDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['City'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: model.comboboxDemo.id,
            model: model.comboboxDemo,
            view: CityCombobox.view,
            viewInputs: {
              ...comboboxInputs({
                inputValue: model.comboboxDemo.inputValue,
                restingInputValue: Option.getOrElse(
                  model.maybeComboboxDemoSelectedCity,
                  () => '',
                ),
              }),
              maybeSelectedValue: model.maybeComboboxDemoSelectedCity,
            },
            toParentMessage: message => GotComboboxDemoMessage({ message }),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Nullable'],
      ),
      h.label(
        [
          h.For(Combobox.inputId(model.comboboxNullableDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['City'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: model.comboboxNullableDemo.id,
            model: model.comboboxNullableDemo,
            view: CityCombobox.view,
            viewInputs: {
              ...comboboxInputs({
                inputValue: model.comboboxNullableDemo.inputValue,
                restingInputValue: Option.getOrElse(
                  model.maybeComboboxNullableDemoSelectedCity,
                  () => '',
                ),
              }),
              maybeSelectedValue: model.maybeComboboxNullableDemoSelectedCity,
            },
            toParentMessage: message =>
              GotComboboxNullableDemoMessage({ message }),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Select on Focus'],
      ),
      h.label(
        [
          h.For(Combobox.inputId(model.comboboxSelectOnFocusDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['City'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: model.comboboxSelectOnFocusDemo.id,
            model: model.comboboxSelectOnFocusDemo,
            view: CityCombobox.view,
            viewInputs: {
              ...comboboxInputs({
                inputValue: model.comboboxSelectOnFocusDemo.inputValue,
                restingInputValue: Option.getOrElse(
                  model.maybeComboboxSelectOnFocusDemoSelectedCity,
                  () => '',
                ),
              }),
              maybeSelectedValue:
                model.maybeComboboxSelectOnFocusDemoSelectedCity,
            },
            toParentMessage: message =>
              GotComboboxSelectOnFocusDemoMessage({ message }),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Multi-Select'],
      ),
      h.label(
        [
          h.For(Combobox.inputId(model.comboboxMultiDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Cities'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.div(
            [h.Class('flex flex-wrap gap-1.5 mb-2')],
            Array.match(model.comboboxMultiDemoSelectedCities, {
              onEmpty: () => [
                h.span([h.Class(emptyTagClassName)], ['No selection']),
              ],
              onNonEmpty: selectedCities =>
                selectedCities.map(city =>
                  h.span([h.Class(tagClassName)], [city]),
                ),
            }),
          ),
          h.submodel({
            slotId: model.comboboxMultiDemo.id,
            model: model.comboboxMultiDemo,
            view: CityMultiCombobox.view,
            viewInputs: {
              ...comboboxInputs({
                inputValue: model.comboboxMultiDemo.inputValue,
                restingInputValue: '',
              }),
              selectedValues: model.comboboxMultiDemoSelectedCities,
            },
            toParentMessage: message =>
              GotComboboxMultiDemoMessage({ message }),
          }),
        ],
      ),
    ],
  )
})
