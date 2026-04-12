import { Array, Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Placeholder, div, span } from './html'

// Add a field to your Model for the Combobox Submodel:
const Model = S.Struct({
  combobox: Ui.Combobox.Model,
  // ...your other fields
})

// In your init function, initialize the Combobox Submodel with a unique id:
const init = () => [
  {
    combobox: Ui.Combobox.init({ id: 'city' }),
    // ...your other fields
  },
  [],
]

// Embed the Combobox Message in your parent Message:
const GotComboboxMessage = m('GotComboboxMessage', {
  message: Ui.Combobox.Message,
})

// In your update, delegate to Combobox.update:
GotComboboxMessage: ({ message }) => {
  const [nextCombobox, commands] = Ui.Combobox.update(model.combobox, message)

  return [
    // Merge the next state into your Model:
    evo(model, { combobox: () => nextCombobox }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotComboboxMessage({ message }))),
    ),
  ]
}

// In your view:
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
