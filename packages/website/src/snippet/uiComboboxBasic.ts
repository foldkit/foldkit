import { Array, Effect, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Placeholder, div, span } from './html'

// MODEL

const Model = S.Struct({
  combobox: Ui.Combobox.Model,
})

// INIT

const init = () => [{ combobox: Ui.Combobox.init({ id: 'city' }) }, []]

// MESSAGE

const GotComboboxMessage = m('GotComboboxMessage', {
  message: Ui.Combobox.Message,
})

// UPDATE

GotComboboxMessage: ({ message }) => {
  const [nextCombobox, commands] = Ui.Combobox.update(model.combobox, message)

  return [
    evo(model, { combobox: () => nextCombobox }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotComboboxMessage({ message }))),
    ),
  ]
}

// VIEW

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
