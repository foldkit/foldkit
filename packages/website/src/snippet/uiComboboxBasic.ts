import { Array } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, Placeholder, div, span } from './html'

// Submodel wiring:
//   Model field: combobox: Ui.Combobox.Model
//   Init: Ui.Combobox.init({ id: 'city' })
//   Update: delegate via Ui.Combobox.update

const GotComboboxMessage = m('GotComboboxMessage', {
  message: Ui.Combobox.Message,
})

type City = 'Johannesburg' | 'Kyiv' | 'Oxford' | 'Wellington'
const cities: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Wellington',
]

// Filter items based on the current input value:
const filteredCities =
  model.combobox.inputValue === ''
    ? cities
    : Array.filter(cities, city =>
        city.toLowerCase().includes(model.combobox.inputValue.toLowerCase()),
      )

Ui.Combobox.view({
  model: model.combobox,
  toParentMessage: message => GotComboboxMessage({ message }),
  items: filteredCities,
  itemToValue: city => city,
  itemToDisplayText: city => city,
  itemToConfig: (city, { isSelected }) => ({
    className: 'px-3 py-2 cursor-pointer data-[active]:bg-blue-100',
    content: div(
      [Class('flex items-center gap-2')],
      [
        isSelected ? span([], ['✓']) : span([Class('w-4')], []),
        span([], [city]),
      ],
    ),
  }),
  inputAttributes: [
    Class('w-full rounded-lg border px-3 py-2'),
    Placeholder('Search cities...'),
  ],
  itemsAttributes: [Class('rounded-lg border shadow-lg')],
  backdropAttributes: [Class('fixed inset-0')],
  anchor: { placement: 'bottom-start', gap: 8, padding: 8 },
})
