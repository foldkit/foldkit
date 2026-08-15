// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Combobox } from '@foldkit/ui'

const City = S.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
type City = typeof City.Type

// Declare a typed Combobox once at module scope:
const CityCombobox = Combobox.create<City>()

// Add a field to your Model for the Combobox Submodel, plus a field for
// the selected value your app actually cares about. Using the `City`
// Schema keeps the field literal-typed end to end:
const Model = S.Struct({
  maybeCity: S.Option(City),
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

// At module scope, fold the OutMessage into your own Model. `Selected`
// carries the activated item; fold it into the selection you own.
// `ClearedSelection` only fires for nullable comboboxes, so this combobox
// keeps its selection there and the fold stays exhaustive. Each arm returns
// an Update.Step over the parent Model, which already has the next Combobox
// Model written back:
const foldComboboxOutMessage = M.type<Combobox.OutMessage<City>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => [evo(model, { maybeCity: () => Option.some(value) }), []],
    ClearedSelection: () => model => [model, []],
  }),
)

// Update.foldChild wires the child into the parent: it delegates keyboard
// navigation, typeahead, and open/close to CityCombobox.update, writes the
// next Combobox Model back, maps the Submodel's Commands into your Message
// type, and hands any OutMessage to foldOutMessage.
const foldCombobox = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.combobox),
  write: (model, nextCombobox) => evo(model, { combobox: () => nextCombobox }),
  toParentMessage: message => GotComboboxMessage({ message }),
  foldOutMessage: foldComboboxOutMessage,
})

// Inside your update function's M.tagsExhaustive({...}), call the fold:
GotComboboxMessage: ({ message }) => foldCombobox(model, message)

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
const view = (model: Model, h: HtmlBuilder<Message>) => {
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
          // The parent owns the selection; pass it in, plus the text the
          // input rests at when closed (the selected city, or empty):
          maybeSelectedValue: model.maybeCity,
          restingInputValue: Option.getOrElse(model.maybeCity, () => ''),
          itemToValue: city => city,
          itemToDisplayText: city => city,
          itemToConfig: (city, { isSelected }) => ({
            className: 'px-3 py-2 cursor-pointer data-[active]:bg-blue-100',
            content: h.div(
              [h.Class('flex items-center gap-2')],
              [
                isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')]),
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
