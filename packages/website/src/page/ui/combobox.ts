import { clsx } from 'clsx'
import { Array, Option } from 'effect'
import {
  type HtmlBuilder,
  childAttributes,
  inertHtml as ih,
} from 'foldkit/html'

import { Combobox } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/combobox'

import { Icon } from '../../icon'
import {
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxPlacementLockDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  type Message,
} from './message'
import type { City } from './model'

// DEMO CONTENT

export const CityCombobox = Combobox.create<City>()
export const CityMultiCombobox = Combobox.Multi.create<City>()

const CITIES: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
]

const inputClassName =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white pl-3 pr-10 py-2 text-base outline-none focus:ring-2 focus:ring-accent-500'

const buttonClassName =
  'absolute inset-y-0 right-0 flex items-center px-4 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors'

const itemsClassName =
  'w-(--button-width) rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg overflow-hidden z-10 outline-none'

const COMBOBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 8,
  padding: 8,
}

const itemClassName =
  'px-3 py-2 text-base text-gray-700 dark:text-gray-200 cursor-pointer data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700/50 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

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
}>): Omit<Combobox.ViewInputs<City>, 'maybeSelectedValue'> => {
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
    buttonAttributes: childAttributes([ih.Class(buttonClassName)]),
    anchor,
  }
}

// VIEW

export const comboboxDemo = (
  comboboxModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Combobox.inputId(comboboxModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['City'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.submodel({
              slotId: comboboxModel.id,
              model: comboboxModel,
              view: CityCombobox.view,
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
              toParentMessage: message => GotComboboxDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

export const nullableDemo = (
  comboboxNullableModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Combobox.inputId(comboboxNullableModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['City'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.submodel({
              slotId: comboboxNullableModel.id,
              model: comboboxNullableModel,
              view: CityCombobox.view,
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
              toParentMessage: message =>
                GotComboboxNullableDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

export const selectOnFocusDemo = (
  comboboxSelectOnFocusModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Combobox.inputId(comboboxSelectOnFocusModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['City'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.submodel({
              slotId: comboboxSelectOnFocusModel.id,
              model: comboboxSelectOnFocusModel,
              view: CityCombobox.view,
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
              toParentMessage: message =>
                GotComboboxSelectOnFocusDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

export const placementLockDemo = (
  comboboxPlacementLockModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<Message>,
) => [
  h.div(
    [
      h.Class(
        'relative flex h-96 w-full items-end justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-cream/60 pb-20 dark:border-gray-700 dark:bg-gray-900/40',
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          h.label(
            [
              h.For(Combobox.inputId(comboboxPlacementLockModel.id)),
              h.Class('text-sm font-medium text-gray-900 dark:text-white'),
            ],
            ['City'],
          ),
          h.div(
            [h.Class('relative')],
            [
              h.submodel({
                slotId: comboboxPlacementLockModel.id,
                model: comboboxPlacementLockModel,
                view: CityCombobox.view,
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
                toParentMessage: message =>
                  GotComboboxPlacementLockDemoMessage({ message }),
              }),
            ],
          ),
        ],
      ),
    ],
  ),
]

const tagClassName =
  'inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'

const emptyTagClassName = 'text-sm py-0.5 text-gray-400 dark:text-gray-500'

export const multiDemo = (
  comboboxMultiModel: Combobox.Multi.Model,
  selectedCities: ReadonlyArray<City>,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Combobox.inputId(comboboxMultiModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
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
            h.submodel({
              slotId: comboboxMultiModel.id,
              model: comboboxMultiModel,
              view: CityMultiCombobox.view,
              viewInputs: {
                ...comboboxViewInputs({
                  inputValue: comboboxMultiModel.inputValue,
                  restingInputValue: '',
                }),
                selectedValues: selectedCities,
              },
              toParentMessage: message =>
                GotComboboxMultiDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}
