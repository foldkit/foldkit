// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Combobox } from '@foldkit/ui'

const City = S.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
type City = typeof City.Type

// Declare a typed multi-select Combobox once at module scope:
const CitiesCombobox = Combobox.Multi.create<City>()

// Add a field to your Model for the Combobox.Multi Submodel, plus a field
// for the selected values your app actually cares about. Using the `City`
// Schema keeps the field literal-typed end to end:
const Model = S.Struct({
  selectedCities: S.Array(City),
  comboboxMulti: Combobox.Multi.Model,
  // ...your other fields
})

// In your init function, initialize the Combobox Submodel with a unique id:
const init = () => ({
  model: {
    selectedCities: [],
    comboboxMulti: Combobox.Multi.init({ id: 'cities-multi' }),
    // ...your other fields
  },
})

// Wrap Combobox's Messages so they can flow through your update:
const Message = defineMessageUnion({
  GotComboboxMultiMessage: { message: Combobox.Message },
})

// At module scope, fold the OutMessage into your own Model. Each `Selected`
// carries the activated item; the parent owns the selection, so it toggles
// the value's membership. `ClearedSelection` only fires for nullable
// comboboxes, so this combobox keeps its selection there and the fold stays
// exhaustive. Each arm returns an Update.Step over the parent Model, which
// already has the next Combobox Model written back:
const foldComboboxMultiOutMessage = M.type<Combobox.OutMessage<City>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          selectedCities: () =>
            Array.contains(model.selectedCities, value)
              ? Array.filter(model.selectedCities, city => city !== value)
              : Array.append(model.selectedCities, value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

// Update.foldChild wires the child into the parent: it delegates keyboard
// navigation, typeahead, and open/close to CitiesCombobox.update, writes the
// next Combobox Model back, maps the Submodel's Commands into your Message
// type, and hands any OutMessage to foldOutMessage.
const foldComboboxMulti = Update.foldChild({
  update: CitiesCombobox.update,
  read: (model: Model) => Option.some(model.comboboxMulti),
  write: (model, nextComboboxMulti) =>
    evo(model, { comboboxMulti: () => nextComboboxMulti }),
  toParentMessage: message => Message.GotComboboxMultiMessage({ message }),
  foldOutMessage: foldComboboxMultiOutMessage,
})

// Inside your update function's Message.match({...}), call the fold:
GotComboboxMultiMessage: ({ message }) => foldComboboxMulti(model, message)

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

// Inside your view function, embed the Combobox.Multi via h.submodel. As with
// the single-select Combobox, give the input an accessible name: target the
// input id with `Combobox.Multi.inputId('cities-multi')` from a native
// `<label for>`, and pass `ariaLabelledBy` so the input is named by the label.
// The attribute is only emitted when provided, so the input never carries a
// dangling `aria-labelledby`.
const view = (model: Model, h: HtmlBuilder<Message>) => {
  const labelId = 'cities-multi-label'

  return h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label(
        [h.Id(labelId), h.For(Combobox.Multi.inputId('cities-multi'))],
        ['Cities'],
      ),
      h.submodel({
        slotId: 'cities-multi',
        model: model.comboboxMulti,
        view: CitiesCombobox.view,
        viewInputs: {
          ariaLabelledBy: labelId,
          items: filteredCities,
          // The parent owns the selection; pass it in. The multi-select
          // input always rests empty on close:
          selectedValues: model.selectedCities,
          restingInputValue: '',
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
        toParentMessage: message =>
          Message.GotComboboxMultiMessage({ message }),
      }),
    ],
  )
}
