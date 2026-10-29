import { clsx } from 'clsx'
import { Array, Option } from 'effect'
import { childAttributes, inertHtml as ih } from 'foldkit/html'

import {
  type AnchorConfig,
  type ViewInputs as ComboboxViewInputs,
  inputId,
} from '@foldkit/ui/combobox'

import { Icon } from '../../../icon'
import { CityComboboxBlock, CityMultiComboboxBlock } from '../combobox'
import type { UiViewBuilder } from '../composition'
import {
  ComboboxDemoBinding,
  ComboboxMultiDemoBinding,
  ComboboxNullableDemoBinding,
  ComboboxPlacementLockDemoBinding,
  ComboboxSelectOnFocusDemoBinding,
} from '../composition'
import type { City } from '../domain/domain'

type CityComboboxBlockModel = typeof CityComboboxBlock.Model.Type
type CityMultiComboboxBlockModel = typeof CityMultiComboboxBlock.Model.Type

// DEMO CONTENT

export { CityComboboxBlock, CityMultiComboboxBlock }

const CITIES: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
]

const inputClassName = 'demo-field-input pr-10'

const buttonClassName =
  'absolute inset-y-0 right-0 flex items-center px-4 cursor-pointer text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors'

const itemsClassName = 'demo-popup-surface w-(--button-width) overflow-hidden'

const COMBOBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 8,
  padding: 8,
}

const itemClassName = 'demo-option'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative w-72'

const filterCities = (inputValue: string): ReadonlyArray<City> =>
  inputValue === ''
    ? CITIES
    : Array.filter(CITIES, city =>
        city.toLowerCase().includes(inputValue.toLowerCase()),
      )

export const comboboxViewInputs = ({
  inputValue,
  restingInputValue,
  anchor = COMBOBOX_ANCHOR,
  wrapperClass = wrapperClassName,
}: Readonly<{
  inputValue: string
  restingInputValue: string
  anchor?: AnchorConfig
  wrapperClass?: string
}>): Omit<ComboboxViewInputs<City>, 'maybeSelectedValue'> => {
  const filteredCities = filterCities(inputValue)

  return {
    items: filteredCities,
    restingInputValue,
    itemToConfig: (city, context) => ({
      className: itemClassName,
      content: ih.div(
        [ih.Class('flex items-center gap-2')],
        [
          Icon.check(
            clsx('w-4 h-4 shrink-0 text-gray-900 dark:text-white', {
              visible: context.isSelected,
              invisible: !context.isSelected,
            }),
          ),
          ih.span([], [city]),
        ],
      ),
    }),
    itemToValue: city => city,
    itemToDisplayText: city => city,
    inputAttributes: childAttributes([
      ih.Class(inputClassName),
      ih.Placeholder('Search cities...'),
    ]),
    itemsAttributes: childAttributes([ih.Class(itemsClassName)]),
    backdropAttributes: childAttributes([ih.Class(backdropClassName)]),
    attributes: childAttributes([ih.Class(wrapperClass)]),
    inputWrapperAttributes: childAttributes([ih.Class('relative')]),
    buttonContent: Icon.chevronDown('w-4 h-4'),
    buttonAttributes: childAttributes([
      ih.AriaLabel('Show suggestions'),
      ih.Class(buttonClassName),
    ]),
    anchor,
  }
}

export const view = (
  comboboxModel: CityComboboxBlockModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(inputId(comboboxModel.id)), h.Class('demo-label')],
          ['City'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.block(
              ComboboxDemoBinding.embedView({
                slotId: comboboxModel.id,
                model: comboboxModel,
                viewInputs: {
                  ...comboboxViewInputs({
                    inputValue: comboboxModel.inputValue,
                    restingInputValue: Option.getOrElse(
                      maybeSelectedCity,
                      () => '',
                    ),
                  }),
                  maybeSelectedValue: maybeSelectedCity,
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ]
}

export const nullableDemo = (
  comboboxNullableModel: CityComboboxBlockModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(inputId(comboboxNullableModel.id)), h.Class('demo-label')],
          ['City'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.block(
              ComboboxNullableDemoBinding.embedView({
                slotId: comboboxNullableModel.id,
                model: comboboxNullableModel,
                viewInputs: {
                  ...comboboxViewInputs({
                    inputValue: comboboxNullableModel.inputValue,
                    restingInputValue: Option.getOrElse(
                      maybeSelectedCity,
                      () => '',
                    ),
                  }),
                  maybeSelectedValue: maybeSelectedCity,
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ]
}

export const selectOnFocusDemo = (
  comboboxSelectOnFocusModel: CityComboboxBlockModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [
            h.For(inputId(comboboxSelectOnFocusModel.id)),
            h.Class('demo-label'),
          ],
          ['City'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.block(
              ComboboxSelectOnFocusDemoBinding.embedView({
                slotId: comboboxSelectOnFocusModel.id,
                model: comboboxSelectOnFocusModel,
                viewInputs: {
                  ...comboboxViewInputs({
                    inputValue: comboboxSelectOnFocusModel.inputValue,
                    restingInputValue: Option.getOrElse(
                      maybeSelectedCity,
                      () => '',
                    ),
                  }),
                  maybeSelectedValue: maybeSelectedCity,
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ]
}

export const placementLockDemo = (
  comboboxPlacementLockModel: CityComboboxBlockModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
) => [
  h.div(
    [
      h.Class(
        'relative flex h-96 w-full items-end justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-cream/60 pb-20 dark:border-gray-700 dark:bg-gray-900/40',
      ),
    ],
    [
      h.div(
        [h.Class('demo-field')],
        [
          h.label(
            [
              h.For(inputId(comboboxPlacementLockModel.id)),
              h.Class('demo-label'),
            ],
            ['City'],
          ),
          h.div(
            [h.Class('relative')],
            [
              h.block(
                ComboboxPlacementLockDemoBinding.embedView({
                  slotId: comboboxPlacementLockModel.id,
                  model: comboboxPlacementLockModel,
                  viewInputs: {
                    ...comboboxViewInputs({
                      inputValue: comboboxPlacementLockModel.inputValue,
                      restingInputValue: Option.getOrElse(
                        maybeSelectedCity,
                        () => '',
                      ),
                      anchor: {
                        ...COMBOBOX_ANCHOR,
                        isPlacementLocked: true,
                        portal: false,
                      },
                    }),
                    maybeSelectedValue: maybeSelectedCity,
                    openOnFocus: true,
                  },
                }),
              ),
            ],
          ),
        ],
      ),
    ],
  ),
]

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'

const emptyTagClassName = 'text-sm py-0.5 text-gray-700 dark:text-gray-400'

export const multiDemo = (
  comboboxMultiModel: CityMultiComboboxBlockModel,
  selectedCities: ReadonlyArray<City>,
  h: UiViewBuilder,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(inputId(comboboxMultiModel.id)), h.Class('demo-label')],
          ['Cities'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.div(
              [h.Class('flex flex-wrap gap-1.5 mb-2')],
              Array.match(selectedCities, {
                onEmpty: () => [
                  h.span([h.Class(emptyTagClassName)], ['No selection']),
                ],
                onNonEmpty: nonEmptySelectedCities =>
                  nonEmptySelectedCities.map(city =>
                    h.span([h.Class(tagClassName)], [city]),
                  ),
              }),
            ),
            h.block(
              ComboboxMultiDemoBinding.embedView({
                slotId: comboboxMultiModel.id,
                model: comboboxMultiModel,
                viewInputs: {
                  ...comboboxViewInputs({
                    inputValue: comboboxMultiModel.inputValue,
                    restingInputValue: '',
                  }),
                  selectedValues: selectedCities,
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ]
}
