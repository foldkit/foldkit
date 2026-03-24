import { Ui } from 'foldkit'

import { Class, button, div, label, p, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import {
  GotCheckboxAllDemoMessage,
  GotCheckboxBasicDemoMessage,
  GotCheckboxOptionADemoMessage,
  GotCheckboxOptionBDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic',
  text: 'Basic',
}

export const indeterminateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'indeterminate',
  text: 'Indeterminate',
}

// DEMO CONTENT

const wrapperClassName = 'flex flex-col gap-1'

const topRowClassName = 'flex items-center gap-2'

const checkboxClassName =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 dark:border-gray-500 cursor-pointer data-[checked]:bg-accent-600 data-[checked]:border-accent-600 data-[indeterminate]:bg-accent-600 data-[indeterminate]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 dark:text-white cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

const checkmark = span([Class('text-white text-xs')], ['\u2713'])

const indeterminateMark = span([Class('text-white text-xs')], ['\u2014'])

// VIEW

export const basicDemo = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', basicHeader.id, basicHeader.text),
  Ui.Checkbox.view({
    model: model.checkboxBasicDemo,
    toParentMessage: message =>
      toParentMessage(GotCheckboxBasicDemoMessage({ message })),
    toView: attributes =>
      div(
        [Class(wrapperClassName)],
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
]

export const indeterminateDemo = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
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
    heading('h3', indeterminateHeader.id, indeterminateHeader.text),
    div(
      [Class('flex flex-col gap-3')],
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
              toParentMessage: message =>
                toParentMessage(GotCheckboxOptionADemoMessage({ message })),
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
              toParentMessage: message =>
                toParentMessage(GotCheckboxOptionBDemoMessage({ message })),
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
