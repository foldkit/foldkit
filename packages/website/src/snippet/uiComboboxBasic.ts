import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Combobox } from '@foldkit/ui'
import { inputId as ComboboxInputId } from '@foldkit/ui/combobox'

const City = Schema.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
type City = typeof City.Type

const CityCombobox = Combobox.makeBlock(City)

const cities: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Wellington',
]

export class CityPicker extends Block<CityPicker>()('CityPicker', {
  Model: Schema.Struct({
    combobox: CityCombobox,
    maybeCity: Schema.Option(City),
  }),
}) {}

export const CityPickerLive = CityPicker.make(
  Effect.fn(function* () {
    const combobox = yield* new CityCombobox('combobox', { id: 'city' })

    return {
      model: { combobox, maybeCity: Option.none() },

      update: {
        // The parent stores the committed selection the Combobox reports
        ...combobox.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { maybeCity: () => Option.some(value) }),
          }),
        }),
      },

      view: (model, h) => {
        const filteredCities =
          model.combobox.model.inputValue === ''
            ? cities
            : Array.filter(cities, city =>
                city
                  .toLowerCase()
                  .includes(model.combobox.model.inputValue.toLowerCase()),
              )

        const labelId = 'city-label'

        return h.div(
          [h.Class('flex flex-col gap-1.5')],
          [
            h.label([h.Id(labelId), h.For(ComboboxInputId('city'))], ['City']),
            model.combobox.view({
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
            }),
          ],
        )
      },
    }
  }),
).pipe(Layer.provide(CityCombobox.Live))
