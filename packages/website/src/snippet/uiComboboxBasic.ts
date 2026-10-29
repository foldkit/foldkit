import { Array, Option, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Combobox } from '@foldkit/ui'
import { inputId as ComboboxInputId } from '@foldkit/ui/combobox'

const City = Schema.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
type City = typeof City.Type

const CityCombobox = Combobox.makeBlock(City)

const Model = Schema.Struct({
  maybeCity: Schema.Option(City),
  combobox: CityCombobox.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({})
type Message = typeof Message.Type

const CityPickerDefinition = Block.makeDefinition('CityPicker', {
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = CityPickerDefinition

// The parent stores the committed selection reported by the child.
const foldComboboxOutMessage = CityPickerDefinition.makeOutMessageFold(
  CityCombobox,
  {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  },
)

const ComboboxBinding = CityPickerDefinition.makeBinding(CityCombobox, {
  field: 'combobox',
  init: { contextToArgs: () => Tuple.make({ id: 'city' }) },
}).withOutMessagePolicy({ fold: foldComboboxOutMessage })

// Including the Binding collects its lifecycle and handler graph.

const CityPickerComposition = CityPickerDefinition.makeComposition({
  bindings: [ComboboxBinding],
})

const init = CityPickerComposition.makeInit(() => ({
  model: { maybeCity: Option.none() },
}))

const update = CityPickerComposition.makeUpdate({})

const cities: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Wellington',
]

const view = CityPickerComposition.makeView((model, h) => {
  const filteredCities =
    model.combobox.inputValue === ''
      ? cities
      : Array.filter(cities, city =>
          city.toLowerCase().includes(model.combobox.inputValue.toLowerCase()),
        )

  const labelId = 'city-label'

  return h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label([h.Id(labelId), h.For(ComboboxInputId('city'))], ['City']),
      h.block(
        ComboboxBinding.embedView({
          slotId: 'city',
          model: model.combobox,
          viewInputs: {
            ariaLabelledBy: labelId,
            items: filteredCities,
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
        }),
      ),
    ],
  )
})

const prepare = () =>
  CityPickerComposition.prepareBlock({
    init,
    update,
    view,
  })
export const CityPickerBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
