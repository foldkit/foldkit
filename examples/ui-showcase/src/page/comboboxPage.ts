import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Combobox } from '@foldkit/ui'
import { inputId } from '@foldkit/ui/combobox'

import {
  COMBOBOX_ANCHOR,
  City,
  CityCombobox,
  comboboxInputs,
} from '../domain/city'

const CityMultiCombobox = Combobox.Multi.makeBlock(City)

const Model = Schema.Struct({
  comboboxDemo: CityCombobox,
  maybeComboboxDemoSelectedCity: Schema.Option(City),
  comboboxNullableDemo: CityCombobox,
  maybeComboboxNullableDemoSelectedCity: Schema.Option(City),
  comboboxMultiDemo: CityMultiCombobox,
  comboboxMultiDemoSelectedCities: Schema.Array(City),
  comboboxPlacementLockDemo: CityCombobox,
  maybeComboboxPlacementLockDemoSelectedCity: Schema.Option(City),
  comboboxSelectOnFocusDemo: CityCombobox,
  maybeComboboxSelectOnFocusDemoSelectedCity: Schema.Option(City),
})
type Model = typeof Model.Type

export class ComboboxPage extends Block<ComboboxPage>()('ComboboxPage', {
  Model,
}) {}

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 text-gray-700'

const emptyTagClassName = 'text-sm py-0.5 text-gray-400'

const view = (model: Model, h: HtmlBuilder<never>): Html => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Combobox']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Single-Select'],
      ),
      h.label(
        [
          h.For(inputId(model.comboboxDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['City'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.comboboxDemo.view({
            ...comboboxInputs(
              {
                inputValue: model.comboboxDemo.model.inputValue,
                restingInputValue: Option.getOrElse(
                  model.maybeComboboxDemoSelectedCity,
                  () => '',
                ),
              },
              h,
            ),
            maybeSelectedValue: model.maybeComboboxDemoSelectedCity,
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-2')],
        ['Locked Placement'],
      ),
      h.p(
        [h.Class('text-sm text-gray-600 mb-4')],
        [
          'The panel keeps the side chosen when it opens as filtering changes its height.',
        ],
      ),
      h.label(
        [
          h.For(inputId(model.comboboxPlacementLockDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['City'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.comboboxPlacementLockDemo.view({
            ...comboboxInputs(
              {
                inputValue: model.comboboxPlacementLockDemo.model.inputValue,
                restingInputValue: Option.getOrElse(
                  model.maybeComboboxPlacementLockDemoSelectedCity,
                  () => '',
                ),
                anchor: {
                  ...COMBOBOX_ANCHOR,
                  isPlacementLocked: true,
                },
              },
              h,
            ),
            maybeSelectedValue:
              model.maybeComboboxPlacementLockDemoSelectedCity,
            openOnFocus: true,
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Nullable'],
      ),
      h.label(
        [
          h.For(inputId(model.comboboxNullableDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['City'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.comboboxNullableDemo.view({
            ...comboboxInputs(
              {
                inputValue: model.comboboxNullableDemo.model.inputValue,
                restingInputValue: Option.getOrElse(
                  model.maybeComboboxNullableDemoSelectedCity,
                  () => '',
                ),
              },
              h,
            ),
            maybeSelectedValue: model.maybeComboboxNullableDemoSelectedCity,
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Select on Focus'],
      ),
      h.label(
        [
          h.For(inputId(model.comboboxSelectOnFocusDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['City'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.comboboxSelectOnFocusDemo.view({
            ...comboboxInputs(
              {
                inputValue: model.comboboxSelectOnFocusDemo.model.inputValue,
                restingInputValue: Option.getOrElse(
                  model.maybeComboboxSelectOnFocusDemoSelectedCity,
                  () => '',
                ),
              },
              h,
            ),
            maybeSelectedValue:
              model.maybeComboboxSelectOnFocusDemoSelectedCity,
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Multi-Select'],
      ),
      h.label(
        [
          h.For(inputId(model.comboboxMultiDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Cities'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.div(
            [h.Class('flex flex-wrap gap-1.5 mb-2')],
            Array.match(model.comboboxMultiDemoSelectedCities, {
              onEmpty: () => [
                h.span([h.Class(emptyTagClassName)], ['No selection']),
              ],
              onNonEmpty: selectedCities =>
                selectedCities.map(city =>
                  h.span([h.Class(tagClassName)], [city]),
                ),
            }),
          ),
          model.comboboxMultiDemo.view({
            ...comboboxInputs(
              {
                inputValue: model.comboboxMultiDemo.model.inputValue,
                restingInputValue: '',
              },
              h,
            ),
            selectedValues: model.comboboxMultiDemoSelectedCities,
          }),
        ],
      ),
    ],
  )
}

export const ComboboxPageLive = ComboboxPage.make(
  Effect.fn(function* () {
    const comboboxDemo = yield* new CityCombobox('comboboxDemo', {
      id: 'combobox-demo',
    })
    const comboboxNullableDemo = yield* new CityCombobox(
      'comboboxNullableDemo',
      { id: 'combobox-nullable-demo', nullable: true },
    )
    const comboboxMultiDemo = yield* new CityMultiCombobox(
      'comboboxMultiDemo',
      { id: 'combobox-multi-demo' },
    )
    const comboboxPlacementLockDemo = yield* new CityCombobox(
      'comboboxPlacementLockDemo',
      { id: 'combobox-placement-lock-demo' },
    )
    const comboboxSelectOnFocusDemo = yield* new CityCombobox(
      'comboboxSelectOnFocusDemo',
      { id: 'combobox-select-on-focus-demo', selectInputOnFocus: true },
    )

    return {
      model: {
        comboboxDemo,
        maybeComboboxDemoSelectedCity: Option.none(),
        comboboxNullableDemo,
        maybeComboboxNullableDemoSelectedCity: Option.none(),
        comboboxMultiDemo,
        comboboxMultiDemoSelectedCities: [],
        comboboxPlacementLockDemo,
        maybeComboboxPlacementLockDemoSelectedCity: Option.none(),
        comboboxSelectOnFocusDemo,
        maybeComboboxSelectOnFocusDemoSelectedCity: Option.none(),
      },

      update: {
        ...comboboxDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxDemoSelectedCity: () => Option.some(value),
            }),
          }),
          ClearedSelection: model => ({ model }),
        }),

        ...comboboxNullableDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxNullableDemoSelectedCity:
                maybeComboboxNullableDemoSelectedCity =>
                  Option.contains(maybeComboboxNullableDemoSelectedCity, value)
                    ? Option.none()
                    : Option.some(value),
            }),
          }),
          ClearedSelection: model => ({
            model: modifyFields(model, {
              maybeComboboxNullableDemoSelectedCity: () => Option.none(),
            }),
          }),
        }),

        ...comboboxMultiDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              comboboxMultiDemoSelectedCities:
                comboboxMultiDemoSelectedCities =>
                  Array.contains(comboboxMultiDemoSelectedCities, value)
                    ? Array.filter(
                        comboboxMultiDemoSelectedCities,
                        city => city !== value,
                      )
                    : Array.append(comboboxMultiDemoSelectedCities, value),
            }),
          }),
          ClearedSelection: model => ({ model }),
        }),

        ...comboboxPlacementLockDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxPlacementLockDemoSelectedCity: () =>
                Option.some(value),
            }),
          }),
          ClearedSelection: model => ({ model }),
        }),

        ...comboboxSelectOnFocusDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxSelectOnFocusDemoSelectedCity: () =>
                Option.some(value),
            }),
          }),
          ClearedSelection: model => ({ model }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(CityCombobox.Live, CityMultiCombobox.Live)))
