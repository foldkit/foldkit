import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

const Model = Schema.Struct({
  isCheckboxBasicDemoChecked: Schema.Boolean,
  isCheckboxOptionADemoChecked: Schema.Boolean,
  isCheckboxOptionBDemoChecked: Schema.Boolean,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ToggledCheckboxBasicDemo: { isChecked: Schema.Boolean },
  ToggledCheckboxAllDemo: { isChecked: Schema.Boolean },
  ToggledCheckboxOptionADemo: { isChecked: Schema.Boolean },
  ToggledCheckboxOptionBDemo: { isChecked: Schema.Boolean },
})
type Message = typeof Message.Type

export class CheckboxPage extends Block<CheckboxPage>()('CheckboxPage', {
  Model,
  Message,
}) {}

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

const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])
  const basicCheckboxView = (
    attributes: Checkbox.CheckboxAttributes<Message>,
  ): Html =>
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
    )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Checkbox']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      Checkbox.view(
        {
          id: CHECKBOX_BASIC_DEMO_ID,
          isChecked: model.isCheckboxBasicDemoChecked,
          hasDescription: true,
          onToggle: isChecked =>
            Message.ToggledCheckboxBasicDemo({ isChecked }),
          toView: basicCheckboxView,
        },
        h,
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Indeterminate'],
      ),
      ...indeterminateDemo(model, h),
    ],
  )
}

const indeterminateDemo = (model: Model, h: HtmlBuilder<Message>) => {
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

  const selectAllView = (
    attributes: Checkbox.CheckboxAttributes<Message>,
  ): Html =>
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
    )

  const emailNotificationsView = (
    attributes: Checkbox.CheckboxAttributes<Message>,
  ): Html =>
    notificationOptionView(
      attributes,
      model.isCheckboxOptionADemoChecked,
      'Email notifications',
    )

  const pushNotificationsView = (
    attributes: Checkbox.CheckboxAttributes<Message>,
  ): Html =>
    notificationOptionView(
      attributes,
      model.isCheckboxOptionBDemoChecked,
      'Push notifications',
    )

  const notificationOptionView = (
    attributes: Checkbox.CheckboxAttributes<Message>,
    isChecked: boolean,
    label: string,
  ): Html =>
    h.div(
      [h.Class(topRowClassName)],
      [
        h.button(
          [...attributes.checkbox, h.Class(checkboxClassName)],
          isChecked ? [checkmark] : [],
        ),
        h.label([...attributes.label, h.Class(labelClassName)], [label]),
      ],
    )

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
            toView: selectAllView,
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
                toView: emailNotificationsView,
              },
              h,
            ),
            Checkbox.view(
              {
                id: CHECKBOX_OPTION_B_DEMO_ID,
                isChecked: model.isCheckboxOptionBDemoChecked,
                onToggle: isChecked =>
                  Message.ToggledCheckboxOptionBDemo({ isChecked }),
                toView: pushNotificationsView,
              },
              h,
            ),
          ],
        ),
      ],
    ),
  ]
}

export const CheckboxPageLive = CheckboxPage.make(
  Effect.fn(function* () {
    return {
      model: {
        isCheckboxBasicDemoChecked: false,
        isCheckboxOptionADemoChecked: false,
        isCheckboxOptionBDemoChecked: false,
      },

      update: {
        ToggledCheckboxBasicDemo: (model, { isChecked }) => ({
          model: modifyFields(model, {
            isCheckboxBasicDemoChecked: () => isChecked,
          }),
        }),

        ToggledCheckboxAllDemo: (model, { isChecked }) => ({
          model: modifyFields(model, {
            isCheckboxOptionADemoChecked: () => isChecked,
            isCheckboxOptionBDemoChecked: () => isChecked,
          }),
        }),

        ToggledCheckboxOptionADemo: (model, { isChecked }) => ({
          model: modifyFields(model, {
            isCheckboxOptionADemoChecked: () => isChecked,
          }),
        }),

        ToggledCheckboxOptionBDemo: (model, { isChecked }) => ({
          model: modifyFields(model, {
            isCheckboxOptionBDemoChecked: () => isChecked,
          }),
        }),
      },

      view,
    }
  }),
)
