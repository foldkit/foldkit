// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Effect, Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { childAttributes, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Combobox } from '@foldkit/ui'

type City = 'Johannesburg' | 'Kyiv' | 'Oxford' | 'Wellington'

// Declare a typed Combobox once at module scope:
const CityCombobox = Combobox.create<City>()

// Add a field to your Model for the Combobox Submodel, plus a field for
// the selected value your app actually cares about:
const Model = S.Struct({
  maybeCity: S.Option(S.String),
  combobox: Combobox.Model,
  // ...your other fields
})

// In your init function, initialize the Combobox Submodel with a unique id:
const init = () => [
  {
    maybeCity: Option.none(),
    combobox: Combobox.init({ id: 'city' }),
    // ...your other fields
  },
  [],
]

// Wrap Combobox's Messages so they can flow through your update:
const GotComboboxMessage = m('GotComboboxMessage', {
  message: Combobox.Message,
})

// Delegate keyboard navigation, typeahead, and open/close to
// CityCombobox.update. The OutMessage's `Selected` carries the chosen
// item; lift it into your domain state:
GotComboboxMessage: ({ message }) => {
  const [nextCombobox, commands, maybeOutMessage] = CityCombobox.update(
    model.combobox,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotComboboxMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { combobox: () => nextCombobox }),
      mappedCommands,
    ],
    onSome: M.type<Combobox.OutMessage>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, {
            combobox: () => nextCombobox,
            maybeCity: () => Option.some(value),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

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

// Inside your view function, embed the Combobox via h.submodel. Give the
// input an accessible name: target the input id with `Combobox.inputId('city')`
// from a native `<label for>`, and pass `ariaLabelledBy` so the input is named
// by the label. The attribute is only emitted when provided, so the input
// never carries a dangling `aria-labelledby`.
const view = () => {
  const h = html<Message>()

  const labelId = 'city-label'

  return h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label([h.Id(labelId), h.For(Combobox.inputId('city'))], ['City']),
      h.submodel({
        slotId: 'city',
        model: model.combobox,
        view: CityCombobox.view,
        viewInputs: {
          ariaLabelledBy: labelId,
          items: filteredCities,
          itemToValue: city => city,
          itemToDisplayText: city => city,
          itemToConfig: (city, { isSelected }) => ({
            className: 'px-3 py-2 cursor-pointer data-[active]:bg-blue-100',
            content: h.div(
              [h.Class('flex items-center gap-2')],
              [
                isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')], []),
                h.span([], [city]),
              ],
            ),
          }),
          inputAttributes: childAttributes([
            h.Class('w-full rounded-lg border px-3 py-2'),
            h.Placeholder('Search cities...'),
          ]),
          itemsAttributes: childAttributes([
            h.Class('rounded-lg border shadow-lg'),
          ]),
          backdropAttributes: childAttributes([h.Class('fixed inset-0')]),
          anchor: { placement: 'bottom-start', gap: 8, padding: 8 },
        },
        toParentMessage: message => GotComboboxMessage({ message }),
      }),
    ],
  )
}
