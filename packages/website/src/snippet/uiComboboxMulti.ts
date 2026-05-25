// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { childAttributes, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

type City = 'Johannesburg' | 'Kyiv' | 'Oxford' | 'Wellington'

// Declare a typed multi-select Combobox once at module scope:
const CitiesCombobox = Ui.Combobox.Multi.create<City>()

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

// Wrap Combobox's Messages so they can flow through your update:
const GotComboboxMultiMessage = m('GotComboboxMultiMessage', {
  message: Ui.Combobox.Message,
})

// Delegate keyboard navigation, typeahead, and open/close to
// CitiesCombobox.update. On toggle, the OutMessage's `Selected` carries
// the item and `wasAdded`:
GotComboboxMultiMessage: ({ message }) => {
  const [nextCombobox, commands, maybeOutMessage] = CitiesCombobox.update(
    model.comboboxMulti,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotComboboxMultiMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { comboboxMulti: () => nextCombobox }),
      mappedCommands,
    ],
    onSome: M.type<Ui.Combobox.OutMessage>().pipe(
      M.tagsExhaustive({
        Selected: ({ value, wasAdded }) => [
          evo(model, {
            comboboxMulti: () => nextCombobox,
            selectedCities: () =>
              wasAdded
                ? Array.append(model.selectedCities, value)
                : Array.filter(model.selectedCities, city => city !== value),
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
  model.comboboxMulti.inputValue === ''
    ? cities
    : Array.filter(cities, city =>
        city
          .toLowerCase()
          .includes(model.comboboxMulti.inputValue.toLowerCase()),
      )

// Inside your view function, embed the Combobox.Multi via h.submodel:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'cities-multi',
    model: model.comboboxMulti,
    view: CitiesCombobox.view,
    viewInputs: {
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
    toParentMessage: message => GotComboboxMultiMessage({ message }),
  })
}
