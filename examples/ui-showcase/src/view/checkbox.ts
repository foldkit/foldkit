import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import {
  GotCheckboxAllDemoMessage,
  GotCheckboxBasicDemoMessage,
  GotCheckboxOptionADemoMessage,
  GotCheckboxOptionBDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const topRowClassName = 'flex items-center gap-2'

const checkboxClassName =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 cursor-pointer data-[checked]:bg-accent-600 data-[checked]:border-accent-600 data-[indeterminate]:bg-accent-600 data-[indeterminate]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500'

export const view = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Checkbox']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      Ui.Checkbox.view({
        model: model.checkboxBasicDemo,
        toParentMessage: message =>
          toParentMessage(GotCheckboxBasicDemoMessage({ message })),
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-1')],
            [
              h.div(
                [h.Class(topRowClassName)],
                [
                  h.button(
                    [...attributes.checkbox, h.Class(checkboxClassName)],
                    model.checkboxBasicDemo.isChecked ? [checkmark] : [],
                  ),
                  h.label(
                    [...attributes.label, h.Class(labelClassName)],
                    ['Accept terms and conditions'],
                  ),
                ],
              ),
              h.p(
                [...attributes.description, h.Class(descriptionClassName)],
                ['You agree to our Terms of Service and Privacy Policy.'],
              ),
            ],
          ),
      }),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Indeterminate'],
      ),
      ...indeterminateDemo<ParentMessage>(model, toParentMessage),
    ],
  )
}

const indeterminateDemo = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])
  const indeterminateMark = h.span([h.Class('text-white text-xs')], ['—'])

  const isAllChecked =
    model.checkboxOptionADemo.isChecked && model.checkboxOptionBDemo.isChecked
  const isNoneChecked =
    !model.checkboxOptionADemo.isChecked && !model.checkboxOptionBDemo.isChecked
  const isIndeterminate = !isAllChecked && !isNoneChecked

  const selectAllMark = isIndeterminate
    ? indeterminateMark
    : isAllChecked
      ? checkmark
      : undefined

  return [
    h.div(
      [h.Class('flex flex-col gap-3')],
      [
        Ui.Checkbox.view({
          model: {
            id: 'checkbox-all-demo',
            isChecked: isAllChecked,
          },
          isIndeterminate,
          toParentMessage: message =>
            toParentMessage(GotCheckboxAllDemoMessage({ message })),
          toView: attributes =>
            h.div(
              [h.Class(topRowClassName)],
              [
                h.button(
                  [...attributes.checkbox, h.Class(checkboxClassName)],
                  selectAllMark ? [selectAllMark] : [],
                ),
                h.label(
                  [...attributes.label, h.Class(labelClassName)],
                  ['All notifications'],
                ),
              ],
            ),
        }),
        h.div(
          [h.Class('ml-7 flex flex-col gap-3')],
          [
            Ui.Checkbox.view({
              model: model.checkboxOptionADemo,
              toParentMessage: message =>
                toParentMessage(GotCheckboxOptionADemoMessage({ message })),
              toView: attributes =>
                h.div(
                  [h.Class(topRowClassName)],
                  [
                    h.button(
                      [...attributes.checkbox, h.Class(checkboxClassName)],
                      model.checkboxOptionADemo.isChecked ? [checkmark] : [],
                    ),
                    h.label(
                      [...attributes.label, h.Class(labelClassName)],
                      ['Email notifications'],
                    ),
                  ],
                ),
            }),
            Ui.Checkbox.view({
              model: model.checkboxOptionBDemo,
              toParentMessage: message =>
                toParentMessage(GotCheckboxOptionBDemoMessage({ message })),
              toView: attributes =>
                h.div(
                  [h.Class(topRowClassName)],
                  [
                    h.button(
                      [...attributes.checkbox, h.Class(checkboxClassName)],
                      model.checkboxOptionBDemo.isChecked ? [checkmark] : [],
                    ),
                    h.label(
                      [...attributes.label, h.Class(labelClassName)],
                      ['Push notifications'],
                    ),
                  ],
                ),
            }),
          ],
        ),
      ],
    ),
  ]
}
