import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, button, div, h2, h3, label, p, span } from '../html'
import type { Message as ParentMessage } from '../main'
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

const checkmark = span([Class('text-white text-xs')], ['\u2713'])

const indeterminateMark = span([Class('text-white text-xs')], ['\u2014'])

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Checkbox']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      Ui.Checkbox.view({
        model: model.checkboxBasicDemo,
        toMessage: message =>
          toMessage(GotCheckboxBasicDemoMessage({ message })),
        toView: attributes =>
          div(
            [Class('flex flex-col gap-1')],
            [
              div(
                [Class(topRowClassName)],
                [
                  button(
                    [...attributes.checkbox, Class(checkboxClassName)],
                    model.checkboxBasicDemo.isChecked ? [checkmark] : [],
                  ),
                  label(
                    [...attributes.label, Class(labelClassName)],
                    ['Accept terms and conditions'],
                  ),
                ],
              ),
              p(
                [...attributes.description, Class(descriptionClassName)],
                ['You agree to our Terms of Service and Privacy Policy.'],
              ),
            ],
          ),
      }),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Indeterminate'],
      ),
      ...indeterminateDemo(model, toMessage),
    ],
  )

const indeterminateDemo = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): ReadonlyArray<Html> => {
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
    div(
      [Class('flex flex-col gap-3')],
      [
        Ui.Checkbox.view({
          model: {
            id: 'checkbox-all-demo',
            isChecked: isAllChecked,
          },
          isIndeterminate,
          toMessage: message =>
            toMessage(GotCheckboxAllDemoMessage({ message })),
          toView: attributes =>
            div(
              [Class(topRowClassName)],
              [
                button(
                  [...attributes.checkbox, Class(checkboxClassName)],
                  selectAllMark ? [selectAllMark] : [],
                ),
                label(
                  [...attributes.label, Class(labelClassName)],
                  ['All notifications'],
                ),
              ],
            ),
        }),
        div(
          [Class('ml-7 flex flex-col gap-3')],
          [
            Ui.Checkbox.view({
              model: model.checkboxOptionADemo,
              toMessage: message =>
                toMessage(GotCheckboxOptionADemoMessage({ message })),
              toView: attributes =>
                div(
                  [Class(topRowClassName)],
                  [
                    button(
                      [...attributes.checkbox, Class(checkboxClassName)],
                      model.checkboxOptionADemo.isChecked ? [checkmark] : [],
                    ),
                    label(
                      [...attributes.label, Class(labelClassName)],
                      ['Email notifications'],
                    ),
                  ],
                ),
            }),
            Ui.Checkbox.view({
              model: model.checkboxOptionBDemo,
              toMessage: message =>
                toMessage(GotCheckboxOptionBDemoMessage({ message })),
              toView: attributes =>
                div(
                  [Class(topRowClassName)],
                  [
                    button(
                      [...attributes.checkbox, Class(checkboxClassName)],
                      model.checkboxOptionBDemo.isChecked ? [checkmark] : [],
                    ),
                    label(
                      [...attributes.label, Class(labelClassName)],
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
