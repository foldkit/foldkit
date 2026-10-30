import clsx from 'clsx'
import { Array, Schema } from 'effect'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'

import { Combobox } from '@foldkit/ui'
import type {
  AnchorConfig,
  ViewInputs as ComboboxViewInputs,
} from '@foldkit/ui/combobox'

import * as Icon from './icon'

export const City = Schema.Literals([
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
])
export type City = typeof City.Type

export const CityCombobox = Combobox.makeBlock(City)

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

export const COMBOBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 8,
  padding: 8,
}

const itemClassName =
  'px-3 py-2 text-base text-gray-700 cursor-pointer data-[active]:bg-gray-100 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative w-full max-w-72'

const filterCities = (inputValue: string): ReadonlyArray<City> =>
  inputValue === ''
    ? CITIES
    : Array.filter(CITIES, city =>
        city.toLowerCase().includes(inputValue.toLowerCase()),
      )

export const comboboxInputs = <Message>(
  {
    inputValue,
    restingInputValue,
    anchor = COMBOBOX_ANCHOR,
    wrapperClass = wrapperClassName,
  }: Readonly<{
    inputValue: string
    restingInputValue: string
    anchor?: AnchorConfig
    wrapperClass?: string
  }>,
  h: HtmlBuilder<Message>,
): Omit<ComboboxViewInputs<City>, 'maybeSelectedValue'> => {
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
