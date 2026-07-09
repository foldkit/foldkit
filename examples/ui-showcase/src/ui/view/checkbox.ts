import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { Checkbox } from '@foldkit/ui'

import {
  ToggledCheckboxAllDemo,
  ToggledCheckboxBasicDemo,
  ToggledCheckboxOptionADemo,
  ToggledCheckboxOptionBDemo,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const CHECKBOX_BASIC_DEMO_ID = 'checkbox-basic-demo'
const CHECKBOX_ALL_DEMO_ID = 'checkbox-all-demo'
const CHECKBOX_OPTION_A_DEMO_ID = 'checkbox-option-a-demo'
const CHECKBOX_OPTION_B_DEMO_ID = 'checkbox-option-b-demo'

const topRowClassName = 'flex items-center gap-2'

const checkboxClassName =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 cursor-pointer data-[checked]:bg-accent-600 data-[checked]:border-accent-600 data-[indeterminate]:bg-accent-600 data-[indeterminate]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500'

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Checkbox']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      Checkbox.view<UiMessage>({
        id: CHECKBOX_BASIC_DEMO_ID,
        isChecked: model.isCheckboxBasicDemoChecked,
        onToggle: isChecked => ToggledCheckboxBasicDemo({ isChecked }),
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-1')],
            [
              h.div(
                [h.Class(topRowClassName)],
                [
                  h.button(
                    [...attributes.checkbox, h.Class(checkboxClassName)],
                    model.isCheckboxBasicDemoChecked ? [checkmark] : [],
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
      ...indeterminateDemo(model),
    ],
  )
})

const indeterminateDemo = (model: UiModel): ReadonlyArray<Html> => {
  const h = html<UiMessage>()

  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])
  const indeterminateMark = h.span([h.Class('text-white text-xs')], ['—'])

  const isAllChecked =
    model.isCheckboxOptionADemoChecked && model.isCheckboxOptionBDemoChecked
  const isNoneChecked =
    !model.isCheckboxOptionADemoChecked && !model.isCheckboxOptionBDemoChecked
  const isIndeterminate = !isAllChecked && !isNoneChecked

  const resolveSelectAllMark = () => {
    if (isIndeterminate) {
      return [indeterminateMark]
    } else if (isAllChecked) {
      return [checkmark]
    } else {
      return []
    }
  }

  return [
    h.div(
      [h.Class('flex flex-col gap-3')],
      [
        Checkbox.view<UiMessage>({
          id: CHECKBOX_ALL_DEMO_ID,
          isChecked: isAllChecked,
          isIndeterminate,
          onToggle: isChecked => ToggledCheckboxAllDemo({ isChecked }),
          toView: attributes =>
            h.div(
              [h.Class(topRowClassName)],
              [
                h.button(
                  [...attributes.checkbox, h.Class(checkboxClassName)],
                  resolveSelectAllMark(),
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
            Checkbox.view<UiMessage>({
              id: CHECKBOX_OPTION_A_DEMO_ID,
              isChecked: model.isCheckboxOptionADemoChecked,
              onToggle: isChecked => ToggledCheckboxOptionADemo({ isChecked }),
              toView: attributes =>
                h.div(
                  [h.Class(topRowClassName)],
                  [
                    h.button(
                      [...attributes.checkbox, h.Class(checkboxClassName)],
                      model.isCheckboxOptionADemoChecked ? [checkmark] : [],
                    ),
                    h.label(
                      [...attributes.label, h.Class(labelClassName)],
                      ['Email notifications'],
                    ),
                  ],
                ),
            }),
            Checkbox.view<UiMessage>({
              id: CHECKBOX_OPTION_B_DEMO_ID,
              isChecked: model.isCheckboxOptionBDemoChecked,
              onToggle: isChecked => ToggledCheckboxOptionBDemo({ isChecked }),
              toView: attributes =>
                h.div(
                  [h.Class(topRowClassName)],
                  [
                    h.button(
                      [...attributes.checkbox, h.Class(checkboxClassName)],
                      model.isCheckboxOptionBDemoChecked ? [checkmark] : [],
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
