import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../../main'
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

// VIEW

export const basicDemo = (model: Model) => {
  const h = html<Message>()

  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])

  return [
    h.submodel({
      slotId: 'checkbox-basic-demo',
      model: model.checkboxBasicDemo,
      view: Ui.Checkbox.view,
      viewInputs: {
        toView: attributes =>
          h.div(
            [h.Class(wrapperClassName)],
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
      },
      toParentMessage: message => GotCheckboxBasicDemoMessage({ message }),
    }),
  ]
}

export const indeterminateDemo = (model: Model) => {
  const h = html<Message>()

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
        h.submodel({
          slotId: 'checkbox-all-demo',
          model: {
            id: 'checkbox-all-demo',
            isChecked: isAllChecked,
          },
          view: Ui.Checkbox.view,
          viewInputs: {
            isIndeterminate,
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
          },
          toParentMessage: message => GotCheckboxAllDemoMessage({ message }),
        }),
        h.div(
          [h.Class('ml-7 flex flex-col gap-3')],
          [
            h.submodel({
              slotId: 'checkbox-option-a-demo',
              model: model.checkboxOptionADemo,
              view: Ui.Checkbox.view,
              viewInputs: {
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
              },
              toParentMessage: message =>
                GotCheckboxOptionADemoMessage({ message }),
            }),
            h.submodel({
              slotId: 'checkbox-option-b-demo',
              model: model.checkboxOptionBDemo,
              view: Ui.Checkbox.view,
              viewInputs: {
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
              },
              toParentMessage: message =>
                GotCheckboxOptionBDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}
