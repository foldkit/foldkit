import { Array, Effect, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Placeholder, div, span } from './html'

// MODEL

const Model = S.Struct({
  comboboxMulti: Ui.Combobox.Multi.Model,
})

// INIT

const init = () => [
  { comboboxMulti: Ui.Combobox.Multi.init({ id: 'cities-multi' }) },
  [],
]

// MESSAGE

const GotComboboxMultiMessage = m('GotComboboxMultiMessage', {
  message: Ui.Combobox.Message,
})

// UPDATE

GotComboboxMultiMessage: ({ message }) => {
  const [nextCombobox, commands] = Ui.Combobox.Multi.update(
    model.comboboxMulti,
    message,
  )

  return [
    evo(model, { comboboxMulti: () => nextCombobox }),
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotComboboxMultiMessage({ message })),
      ),
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

const filteredCities =
  model.comboboxMulti.inputValue === ''
    ? cities
    : Array.filter(cities, city =>
        city
          .toLowerCase()
          .includes(model.comboboxMulti.inputValue.toLowerCase()),
      )

Ui.Combobox.Multi.view({
  model: model.comboboxMulti,
  toParentMessage: message => GotComboboxMultiMessage({ message }),
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
