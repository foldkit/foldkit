// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Placeholder, div, span } from './html'

// Add a field to your Model for the Combobox.Multi Submodel, plus a field
// for the selected values your app actually cares about:
const Model = S.Struct({
  selectedCities: S.Array(S.String),
  comboboxMulti: Ui.Combobox.Multi.Model,
  // ...your other fields
})

// In your init function, initialize the Combobox Submodel with a unique id:
const init = () => [
  {
    selectedCities: [],
    comboboxMulti: Ui.Combobox.Multi.init({ id: 'cities-multi' }),
    // ...your other fields
  },
  [],
]

// Embed the Combobox Message for keyboard/input events, plus your own
// Message for the actual selection:
const GotComboboxMultiMessage = m('GotComboboxMultiMessage', {
  message: Ui.Combobox.Message,
})
const ToggledCity = m('ToggledCity', { value: S.String })

// Inside your update function's M.tagsExhaustive({...}), delegate keyboard
// navigation, typeahead, and open/close to Combobox.Multi.update:
GotComboboxMultiMessage: ({ message }) => {
  const [nextCombobox, commands] = Ui.Combobox.Multi.update(
    model.comboboxMulti,
    message,
  )

  return [
    // Merge the next state into your Model:
    evo(model, { comboboxMulti: () => nextCombobox }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotComboboxMultiMessage({ message })),
      ),
    ),
  ]
}

// Still inside your update function's M.tagsExhaustive({...}), handle your
// own toggle Message:
ToggledCity: ({ value }) => {
  // Ui.Combobox.Multi.selectItem gives you the next combobox state with
  // the value toggled in or out of the selection. Multi-select stays open
  // on selection, so the returned Commands are empty:
  const [nextCombobox] = Ui.Combobox.Multi.selectItem(
    model.comboboxMulti,
    value,
  )

  return [
    evo(model, {
      selectedCities: () =>
        Array.contains(model.selectedCities, value)
          ? Array.filter(model.selectedCities, city => city !== value)
          : Array.append(model.selectedCities, value),
      comboboxMulti: () => nextCombobox,
    }),
    [],
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
  model.comboboxMulti.inputValue === ''
    ? cities
    : Array.filter(cities, city =>
        city
          .toLowerCase()
          .includes(model.comboboxMulti.inputValue.toLowerCase()),
      )

// Inside your view function, pass onSelectedItem to fire your ToggledCity
// Message on selection:
Ui.Combobox.Multi.view({
  model: model.comboboxMulti,
  toParentMessage: message => GotComboboxMultiMessage({ message }),
  onSelectedItem: value => ToggledCity({ value }),
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
