import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, Value, div, h2, h3, label, option, select, span } from '../html'
import * as Icon from '../icon'
import type { Message as ParentMessage } from '../main'
import { type UiMessage, UpdatedSelectDemoValue } from '../message'
import type { UiModel } from '../model'

const selectClassName =
  'appearance-none inline-flex items-center gap-2 w-full px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const selectWrapperClassName = 'relative w-full'

const chevronClassName =
  'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'

const labelClassName = 'block text-sm font-medium text-gray-700'

const descriptionClassName = 'text-sm text-gray-500'

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Select']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      div(
        [Class('flex flex-col items-start gap-2 max-w-sm')],
        [
          Ui.Select.view({
            id: 'select-basic-demo',
            value: model.selectDemoValue,
            onChange: value =>
              toParentMessage(UpdatedSelectDemoValue({ value })),
            toView: attributes =>
              div(
                [Class('flex flex-col gap-1.5 w-full')],
                [
                  label(
                    [...attributes.label, Class(labelClassName)],
                    ['Country'],
                  ),
                  div(
                    [Class(selectWrapperClassName)],
                    [
                      select(
                        [...attributes.select, Class(selectClassName)],
                        [
                          option([Value('us')], ['United States']),
                          option([Value('ca')], ['Canada']),
                          option([Value('gb')], ['United Kingdom']),
                          option([Value('au')], ['Australia']),
                        ],
                      ),
                      span(
                        [Class(chevronClassName)],
                        [Icon.chevronDown('w-4 h-4')],
                      ),
                    ],
                  ),
                  span(
                    [...attributes.description, Class(descriptionClassName)],
                    ['Where you currently reside.'],
                  ),
                ],
              ),
          }),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Ui.Select.view<ParentMessage>({
        id: 'select-disabled-demo',
        isDisabled: true,
        value: 'us',
        toView: attributes =>
          div(
            [Class('flex flex-col gap-1.5 max-w-sm')],
            [
              label([...attributes.label, Class(labelClassName)], ['Country']),
              div(
                [Class(selectWrapperClassName)],
                [
                  select(
                    [...attributes.select, Class(selectClassName)],
                    [
                      option([Value('us')], ['United States']),
                      option([Value('ca')], ['Canada']),
                      option([Value('gb')], ['United Kingdom']),
                      option([Value('au')], ['Australia']),
                    ],
                  ),
                  span(
                    [Class(chevronClassName)],
                    [Icon.chevronDown('w-4 h-4')],
                  ),
                ],
              ),
              span(
                [...attributes.description, Class(descriptionClassName)],
                ['This select is disabled.'],
              ),
            ],
          ),
      }),
    ],
  )
