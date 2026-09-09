import type { HtmlBuilder } from 'foldkit/html'

import { Checkbox } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'

export const CHECKBOX_BASIC_DEMO_ID = 'checkbox-basic-demo'
export const CHECKBOX_ALL_DEMO_ID = 'checkbox-all-demo'
export const CHECKBOX_OPTION_A_DEMO_ID = 'checkbox-option-a-demo'
export const CHECKBOX_OPTION_B_DEMO_ID = 'checkbox-option-b-demo'

// DEMO CONTENT

const wrapperClassName = 'flex flex-col gap-1'

const topRowClassName = 'flex items-center gap-2'

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  const checkmark = h.span([h.Class('demo-checkbox-mark')], ['✓'])

  return [
    Checkbox.view(
      {
        id: CHECKBOX_BASIC_DEMO_ID,
        isChecked: model.isCheckboxBasicDemoChecked,
        onToggle: isChecked => Message.ToggledCheckboxBasicDemo({ isChecked }),
        toView: attributes =>
          h.div(
            [h.Class(wrapperClassName)],
            [
              h.div(
                [h.Class(topRowClassName)],
                [
                  h.button(
                    [...attributes.checkbox, h.Class('demo-checkbox')],
                    model.isCheckboxBasicDemoChecked ? [checkmark] : [],
                  ),
                  h.label(
                    [...attributes.label, h.Class('demo-toggle-label')],
                    ['Accept terms and conditions'],
                  ),
                ],
              ),
              h.p(
                [...attributes.description, h.Class('demo-description')],
                ['You agree to our Terms of Service and Privacy Policy.'],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

export const indeterminateDemo = (model: Model, h: HtmlBuilder<Message>) => {
  const checkmark = h.span([h.Class('demo-checkbox-mark')], ['✓'])
  const indeterminateMark = h.span([h.Class('demo-checkbox-mark')], ['—'])

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
        Checkbox.view(
          {
            id: CHECKBOX_ALL_DEMO_ID,
            isChecked: isAllChecked,
            isIndeterminate,
            onToggle: isChecked =>
              Message.ToggledCheckboxAllDemo({ isChecked }),
            toView: attributes =>
              h.div(
                [h.Class(topRowClassName)],
                [
                  h.button(
                    [...attributes.checkbox, h.Class('demo-checkbox')],
                    resolveSelectAllMark(),
                  ),
                  h.label(
                    [...attributes.label, h.Class('demo-toggle-label')],
                    ['All notifications'],
                  ),
                ],
              ),
          },
          h,
        ),
        h.div(
          [h.Class('ml-7 flex flex-col gap-3')],
          [
            Checkbox.view(
              {
                id: CHECKBOX_OPTION_A_DEMO_ID,
                isChecked: model.isCheckboxOptionADemoChecked,
                onToggle: isChecked =>
                  Message.ToggledCheckboxOptionADemo({ isChecked }),
                toView: attributes =>
                  h.div(
                    [h.Class(topRowClassName)],
                    [
                      h.button(
                        [...attributes.checkbox, h.Class('demo-checkbox')],
                        model.isCheckboxOptionADemoChecked ? [checkmark] : [],
                      ),
                      h.label(
                        [...attributes.label, h.Class('demo-toggle-label')],
                        ['Email notifications'],
                      ),
                    ],
                  ),
              },
              h,
            ),
            Checkbox.view(
              {
                id: CHECKBOX_OPTION_B_DEMO_ID,
                isChecked: model.isCheckboxOptionBDemoChecked,
                onToggle: isChecked =>
                  Message.ToggledCheckboxOptionBDemo({ isChecked }),
                toView: attributes =>
                  h.div(
                    [h.Class(topRowClassName)],
                    [
                      h.button(
                        [...attributes.checkbox, h.Class('demo-checkbox')],
                        model.isCheckboxOptionBDemoChecked ? [checkmark] : [],
                      ),
                      h.label(
                        [...attributes.label, h.Class('demo-toggle-label')],
                        ['Push notifications'],
                      ),
                    ],
                  ),
              },
              h,
            ),
          ],
        ),
      ],
    ),
  ]
}
