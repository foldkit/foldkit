import { Array, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Combobox } from '@foldkit/ui'
import { inputId as MultiComboboxInputId } from '@foldkit/ui/combobox'

const City = Schema.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])

const CitiesCombobox = Combobox.Multi.create(City)

const Model = Schema.Struct({
  selectedCities: Schema.Array(City),
  comboboxMulti: CitiesCombobox.Model,
})

const Message = defineMessageUnion({})

const CitiesPickerDefinition = Block.makeDefinition('CitiesPicker', {
  Model,
  Message,
})

// The parent toggles the committed value in the selection it owns.
const foldComboboxMultiOutMessage = CitiesPickerDefinition.makeOutMessageFold(
  CitiesCombobox,
  {
    Selected: ({ value }) =>
      CitiesPickerDefinition.makeFieldsStep(() => ({
        selectedCities: selectedCities =>
          Array.contains(selectedCities, value)
            ? Array.filter(selectedCities, city => city !== value)
            : Array.append(selectedCities, value),
      })),
    ClearedSelection: CitiesPickerDefinition.makeNoopStep,
  },
)

const ComboboxBinding = CitiesPickerDefinition.makeBinding(CitiesCombobox, {
  field: 'comboboxMulti',
  init: { contextToArgs: () => Tuple.make({ id: 'cities-multi' }) },
}).withOutMessagePolicy({ fold: foldComboboxMultiOutMessage })

// Including the Binding collects its lifecycle and handler graph.

const CitiesPickerComposition = CitiesPickerDefinition.makeComposition({
  bindings: [ComboboxBinding],
})

const init = CitiesPickerComposition.makeInit(() => ({
  model: {
    selectedCities: [],
  },
}))

const update = CitiesPickerComposition.makeUpdate({})

const cities: ReadonlyArray<typeof City.Type> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Wellington',
]

const view = CitiesPickerComposition.makeView((model, h) => {
  const filteredCities =
    model.comboboxMulti.inputValue === ''
      ? cities
      : Array.filter(cities, city =>
          city
            .toLowerCase()
            .includes(model.comboboxMulti.inputValue.toLowerCase()),
        )

  const labelId = 'cities-multi-label'

  return h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label(
        [h.Id(labelId), h.For(MultiComboboxInputId('cities-multi'))],
        ['Cities'],
      ),
      h.block(
        ComboboxBinding.embedView({
          slotId: 'cities-multi',
          model: model.comboboxMulti,
          viewInputs: {
            ariaLabelledBy: labelId,
            items: filteredCities,
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
        }),
      ),
    ],
  )
})

const prepare = () =>
  CitiesPickerComposition.prepareBlock({
    init,
    update,
    view,
  })
export const CitiesPickerBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
