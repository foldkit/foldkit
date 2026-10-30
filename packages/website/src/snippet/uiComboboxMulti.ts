import { Array, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Combobox } from '@foldkit/ui'
import { inputId as MultiComboboxInputId } from '@foldkit/ui/combobox'

const City = Schema.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
type City = typeof City.Type

const CitiesCombobox = Combobox.Multi.makeBlock(City)

const cities: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Wellington',
]

export class CitiesPicker extends Block<CitiesPicker>()('CitiesPicker', {
  Model: Schema.Struct({
    comboboxMulti: CitiesCombobox,
    selectedCities: Schema.Array(City),
  }),
}) {}

export const CitiesPickerLive = CitiesPicker.make(
  Effect.fn(function* () {
    const comboboxMulti = yield* new CitiesCombobox('comboboxMulti', {
      id: 'cities-multi',
    })

    return {
      model: { comboboxMulti, selectedCities: [] },

      update: {
        // The parent toggles the committed value in the selection it owns
        ...comboboxMulti.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              selectedCities: selectedCities =>
                Array.contains(selectedCities, value)
                  ? Array.filter(selectedCities, city => city !== value)
                  : Array.append(selectedCities, value),
            }),
          }),
        }),
      },

      view: (model, h) => {
        const filteredCities =
          model.comboboxMulti.model.inputValue === ''
            ? cities
            : Array.filter(cities, city =>
                city
                  .toLowerCase()
                  .includes(model.comboboxMulti.model.inputValue.toLowerCase()),
              )

        const labelId = 'cities-multi-label'

        return h.div(
          [h.Class('flex flex-col gap-1.5')],
          [
            h.label(
              [h.Id(labelId), h.For(MultiComboboxInputId('cities-multi'))],
              ['Cities'],
            ),
            model.comboboxMulti.view({
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
            }),
          ],
        )
      },
    }
  }),
).pipe(Layer.provide(CitiesCombobox.Live))
