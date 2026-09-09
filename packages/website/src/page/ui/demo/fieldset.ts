import type { Html, HtmlBuilder } from 'foldkit/html'

import { Checkbox, Fieldset, Input, Textarea } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'

const FIELDSET_CHECKBOX_DEMO_ID = 'fieldset-checkbox-demo'
const FIELDSET_DISABLED_CHECKBOX_ID = 'fieldset-disabled-checkbox'

// SHARED STYLES

const fieldsetClassName = 'w-full p-6'

const legendClassName =
  'float-left w-full text-base font-semibold text-gray-900 dark:text-white'

const fieldsClassName = 'mt-4 flex flex-col gap-4'

// FIELDS

const checkmark = (h: HtmlBuilder<Message>): Html =>
  h.span([h.Class('demo-checkbox-mark')], ['✓'])

const nameInput = (value: string, h: HtmlBuilder<Message>): Html =>
  Input.view(
    {
      id: 'fieldset-name-input',
      value,
      onInput: inputValue =>
        Message.UpdatedFieldsetInputValue({ value: inputValue }),
      placeholder: 'Enter your full name',
      toView: attributes =>
        h.div(
          [h.Class('demo-field')],
          [
            h.label([...attributes.label, h.Class('demo-label')], ['Name']),
            h.input([...attributes.input, h.Class('demo-field-input')]),
            h.span(
              [...attributes.description, h.Class('demo-description')],
              ['As it appears on your government-issued ID.'],
            ),
          ],
        ),
    },
    h,
  )

const bioTextarea = (value: string, h: HtmlBuilder<Message>): Html =>
  Textarea.view(
    {
      id: 'fieldset-bio-textarea',
      value,
      onInput: textareaValue =>
        Message.UpdatedFieldsetTextareaValue({ value: textareaValue }),
      placeholder: 'Tell us about yourself...',
      rows: 3,
      toView: attributes =>
        h.div(
          [h.Class('demo-field')],
          [
            h.label([...attributes.label, h.Class('demo-label')], ['Bio']),
            h.textarea([
              ...attributes.textarea,
              h.Class('demo-field-textarea'),
            ]),
            h.span(
              [...attributes.description, h.Class('demo-description')],
              ['A brief introduction about yourself.'],
            ),
          ],
        ),
    },
    h,
  )

const termsCheckbox = (isChecked: boolean, h: HtmlBuilder<Message>): Html =>
  Checkbox.view(
    {
      id: FIELDSET_CHECKBOX_DEMO_ID,
      isChecked,
      onToggle: nextIsChecked =>
        Message.ToggledFieldsetCheckboxDemo({ isChecked: nextIsChecked }),
      toView: attributes =>
        h.div(
          [h.Class('flex flex-col gap-1')],
          [
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.button(
                  [...attributes.checkbox, h.Class('demo-checkbox')],
                  isChecked ? [checkmark(h)] : [],
                ),
                h.label(
                  [...attributes.label, h.Class('demo-toggle-label')],
                  ['I agree to the terms and conditions'],
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
  )

// DISABLED FIELDS

const disabledNameInput = (h: HtmlBuilder<Message>): Html =>
  Input.view(
    {
      id: 'fieldset-disabled-name-input',
      isDisabled: true,
      value: 'Ada Lovelace',
      toView: attributes =>
        h.div(
          [h.Class('demo-field')],
          [
            h.label([...attributes.label, h.Class('demo-label')], ['Name']),
            h.input([...attributes.input, h.Class('demo-field-input')]),
          ],
        ),
    },
    h,
  )

const disabledBioTextarea = (h: HtmlBuilder<Message>): Html =>
  Textarea.view(
    {
      id: 'fieldset-disabled-bio-textarea',
      isDisabled: true,
      value:
        'Mathematician and writer, known for work on Charles Babbage’s Analytical Engine.',
      rows: 3,
      toView: attributes =>
        h.div(
          [h.Class('demo-field')],
          [
            h.label([...attributes.label, h.Class('demo-label')], ['Bio']),
            h.textarea([
              ...attributes.textarea,
              h.Class('demo-field-textarea'),
            ]),
          ],
        ),
    },
    h,
  )

const disabledTermsCheckbox = (h: HtmlBuilder<Message>): Html =>
  Checkbox.view(
    {
      id: FIELDSET_DISABLED_CHECKBOX_ID,
      isChecked: true,
      isDisabled: true,
      onToggle: isChecked => Message.ToggledFieldsetCheckboxDemo({ isChecked }),
      toView: attributes =>
        h.div(
          [h.Class('flex items-center gap-2')],
          [
            h.button(
              [...attributes.checkbox, h.Class('demo-checkbox')],
              [checkmark(h)],
            ),
            h.label(
              [...attributes.label, h.Class('demo-toggle-label')],
              ['I agree to the terms and conditions'],
            ),
          ],
        ),
    },
    h,
  )

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  return [
    Fieldset.view(
      {
        id: 'fieldset-basic-demo',
        toView: attributes =>
          h.fieldset(
            [...attributes.fieldset, h.Class(fieldsetClassName)],
            [
              h.legend(
                [...attributes.legend, h.Class(legendClassName)],
                ['Personal Information'],
              ),
              h.span(
                [...attributes.description, h.Class('demo-description mt-1')],
                ['We just need a few details.'],
              ),
              h.div(
                [h.Class(fieldsClassName)],
                [
                  nameInput(model.fieldsetInputValue, h),
                  bioTextarea(model.fieldsetTextareaValue, h),
                  termsCheckbox(model.isFieldsetCheckboxDemoChecked, h),
                ],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

export const disabledDemo = (_model: Model, h: HtmlBuilder<Message>) => {
  return [
    Fieldset.view(
      {
        id: 'fieldset-disabled-demo',
        isDisabled: true,
        toView: attributes =>
          h.fieldset(
            [...attributes.fieldset, h.Class(fieldsetClassName)],
            [
              h.legend(
                [...attributes.legend, h.Class(legendClassName)],
                ['Personal Information'],
              ),
              h.span(
                [...attributes.description, h.Class('demo-description mt-1')],
                ['This fieldset is disabled.'],
              ),
              h.div(
                [h.Class(fieldsClassName)],
                [
                  disabledNameInput(h),
                  disabledBioTextarea(h),
                  disabledTermsCheckbox(h),
                ],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}
