// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Effect, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Placeholder, div, span } from './html'

// Add a field to your Model for the Combobox Submodel, plus a field for
// the selected value your app actually cares about:
const Model = S.Struct({
  maybeCity: S.Option(S.String),
  combobox: Ui.Combobox.Model,
  // ...your other fields
})

// In your init function, initialize the Combobox Submodel with a unique id:
const init = () => [
  {
    maybeCity: Option.none(),
    combobox: Ui.Combobox.init({ id: 'city' }),
    // ...your other fields
  },
  [],
]

// Embed the Combobox Message for keyboard/input events, plus your own
// Message for the actual selection:
const GotComboboxMessage = m('GotComboboxMessage', {
  message: Ui.Combobox.Message,
})
const SelectedCity = m('SelectedCity', { value: S.String })

// Inside your update function's M.tagsExhaustive({...}), delegate keyboard
// navigation, typeahead, and open/close to Combobox.update:
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

// Still inside your update function's M.tagsExhaustive({...}), handle your
// own selection Message:
SelectedCity: ({ value }) => {
  // Ui.Combobox.selectItem gives you the next combobox state with the
  // selection reflected (input value updated, dropdown closed), plus
  // the Commands that return focus to the input. Single-select combobox
  // takes both the item value and the display text:
  const [nextCombobox, commands] = Ui.Combobox.selectItem(
    model.combobox,
    value,
    value,
  )

  return [
    evo(model, {
      maybeCity: () => Option.some(value),
      combobox: () => nextCombobox,
    }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotComboboxMessage({ message }))),
    ),
  ]
}

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

// Inside your view function, pass onSelectedItem to fire your SelectedCity
// Message on selection:
Ui.Combobox.view({
  model: model.combobox,
  toParentMessage: message => GotComboboxMessage({ message }),
  onSelectedItem: value => SelectedCity({ value }),
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
