import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import * as Icon from '../../icon'
import { type UiMessage, UpdatedSelectDemoValue } from '../message'
import type { UiModel } from '../model'

const selectClassName =
  'appearance-none inline-flex items-center gap-2 w-full px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const selectWrapperClassName = 'relative w-full'

const chevronClassName =
  'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'

const labelClassName = 'block text-sm font-medium text-gray-700'

const descriptionClassName = 'text-sm text-gray-500'

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Select']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('flex flex-col items-start gap-2 max-w-sm')],
        [
          Ui.Select.view<UiMessage>({
            id: 'select-basic-demo',
            value: model.selectDemoValue,
            onChange: value => UpdatedSelectDemoValue({ value }),
            toView: attributes =>
              h.div(
                [h.Class('flex flex-col gap-1.5 w-full')],
                [
                  h.label(
                    [...attributes.label, h.Class(labelClassName)],
                    ['Country'],
                  ),
                  h.div(
                    [h.Class(selectWrapperClassName)],
                    [
                      h.select(
                        [...attributes.select, h.Class(selectClassName)],
                        [
                          h.option([h.Value('us')], ['United States']),
                          h.option([h.Value('ca')], ['Canada']),
                          h.option([h.Value('gb')], ['United Kingdom']),
                          h.option([h.Value('au')], ['Australia']),
                        ],
                      ),
                      h.span(
                        [h.Class(chevronClassName)],
                        [Icon.chevronDown('w-4 h-4')],
                      ),
                    ],
                  ),
                  h.span(
                    [...attributes.description, h.Class(descriptionClassName)],
                    ['Where you currently reside.'],
                  ),
                ],
              ),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Ui.Select.view<UiMessage>({
        id: 'select-disabled-demo',
        isDisabled: true,
        value: 'us',
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-1.5 max-w-sm')],
            [
              h.label(
                [...attributes.label, h.Class(labelClassName)],
                ['Country'],
              ),
              h.div(
                [h.Class(selectWrapperClassName)],
                [
                  h.select(
                    [...attributes.select, h.Class(selectClassName)],
                    [
                      h.option([h.Value('us')], ['United States']),
                      h.option([h.Value('ca')], ['Canada']),
                      h.option([h.Value('gb')], ['United Kingdom']),
                      h.option([h.Value('au')], ['Australia']),
                    ],
                  ),
                  h.span(
                    [h.Class(chevronClassName)],
                    [Icon.chevronDown('w-4 h-4')],
                  ),
                ],
              ),
              h.span(
                [...attributes.description, h.Class(descriptionClassName)],
                ['This select is disabled.'],
              ),
            ],
          ),
      }),
    ],
  )
})
