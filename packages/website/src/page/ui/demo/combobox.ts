import { clsx } from 'clsx'
import { Array, Option } from 'effect'
import {
  type HtmlBuilder,
  childAttributes,
  inertHtml as ih,
} from 'foldkit/html'

import { Combobox } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/combobox'

import { Icon } from '../../../icon'
import { Message } from '../message'
import type { City } from '../model'

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

const inputClassName = 'demo-field-input pr-10'

const buttonClassName =
  'absolute inset-y-0 right-0 flex items-center px-4 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors'

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
    buttonAttributes: childAttributes([
      ih.AriaLabel('Show suggestions'),
      ih.Class(buttonClassName),
    ]),
    anchor,
  }
}

// VIEW

export const view = (
  comboboxModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(Combobox.inputId(comboboxModel.id)), h.Class('demo-label')],
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
              toParentMessage: message =>
                Message.GotComboboxDemoMessage({ message }),
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
      [h.Class('demo-field')],
      [
        h.label(
          [
            h.For(Combobox.inputId(comboboxNullableModel.id)),
            h.Class('demo-label'),
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
                Message.GotComboboxNullableDemoMessage({ message }),
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
      [h.Class('demo-field')],
      [
        h.label(
          [
            h.For(Combobox.inputId(comboboxSelectOnFocusModel.id)),
            h.Class('demo-label'),
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
                Message.GotComboboxSelectOnFocusDemoMessage({ message }),
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
        [h.Class('demo-field')],
        [
          h.label(
            [
              h.For(Combobox.inputId(comboboxPlacementLockModel.id)),
              h.Class('demo-label'),
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
                  Message.GotComboboxPlacementLockDemoMessage({ message }),
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
      [h.Class('demo-field')],
      [
        h.label(
          [
            h.For(Combobox.inputId(comboboxMultiModel.id)),
            h.Class('demo-label'),
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
                Message.GotComboboxMultiDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}
