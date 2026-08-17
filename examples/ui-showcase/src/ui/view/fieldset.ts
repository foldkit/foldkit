import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Checkbox, Fieldset, Input, Textarea } from '@foldkit/ui'

import {
  ToggledFieldsetCheckboxDemo,
  type UiMessage,
  UpdatedFieldsetInputValue,
  UpdatedFieldsetTextareaValue,
} from '../message'
import type { UiModel } from '../model'

const FIELDSET_CHECKBOX_DEMO_ID = 'fieldset-checkbox-demo'
const FIELDSET_DISABLED_CHECKBOX_ID = 'fieldset-disabled-checkbox'

const fieldsetClassName = 'rounded-lg border border-gray-200 p-6'

const legendClassName =
  'float-left w-full text-base font-semibold text-gray-900'

const descriptionClassName = 'text-sm text-gray-500'

const labelClassName = 'block text-sm font-medium text-gray-700'

const inputClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const textareaClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const checkboxClassName =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 cursor-pointer data-[checked]:bg-accent-600 data-[checked]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const checkboxLabelClassName =
  'text-sm font-normal text-gray-900 cursor-pointer select-none'

const checkboxDescriptionClassName = 'text-sm text-gray-500'

const fieldClassName = 'flex flex-col gap-1.5'

const fieldsClassName = 'mt-4 flex flex-col gap-4'

const sectionHeadingClassName = 'text-lg font-semibold text-gray-900 mt-8 mb-4'

// FIELDS

const checkmark = (h: HtmlBuilder<UiMessage>): Html =>
  h.span([h.Class('text-white text-xs')], ['✓'])

const nameInput = (value: string, h: HtmlBuilder<UiMessage>): Html =>
  Input.view(
    {
      id: 'fieldset-name-input',
      value,
      onInput: inputValue => UpdatedFieldsetInputValue({ value: inputValue }),
      placeholder: 'Enter your full name',
      toView: attributes =>
        h.div(
          [h.Class(fieldClassName)],
          [
            h.label([...attributes.label, h.Class(labelClassName)], ['Name']),
            h.input([...attributes.input, h.Class(inputClassName)]),
            h.span(
              [...attributes.description, h.Class(descriptionClassName)],
              ['As it appears on your government-issued ID.'],
            ),
          ],
        ),
    },
    h,
  )

const bioTextarea = (value: string, h: HtmlBuilder<UiMessage>): Html =>
  Textarea.view(
    {
      id: 'fieldset-bio-textarea',
      value,
      onInput: textareaValue =>
        UpdatedFieldsetTextareaValue({ value: textareaValue }),
      placeholder: 'Tell us about yourself...',
      rows: 3,
      toView: attributes =>
        h.div(
          [h.Class(fieldClassName)],
          [
            h.label([...attributes.label, h.Class(labelClassName)], ['Bio']),
            h.textarea([...attributes.textarea, h.Class(textareaClassName)]),
            h.span(
              [...attributes.description, h.Class(descriptionClassName)],
              ['A brief introduction about yourself.'],
            ),
          ],
        ),
    },
    h,
  )

const termsCheckbox = (isChecked: boolean, h: HtmlBuilder<UiMessage>): Html =>
  Checkbox.view(
    {
      id: FIELDSET_CHECKBOX_DEMO_ID,
      isChecked,
      onToggle: nextIsChecked =>
        ToggledFieldsetCheckboxDemo({ isChecked: nextIsChecked }),
      toView: attributes =>
        h.div(
          [h.Class('flex flex-col gap-1')],
          [
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.button(
                  [...attributes.checkbox, h.Class(checkboxClassName)],
                  isChecked ? [checkmark(h)] : [],
                ),
                h.label(
                  [...attributes.label, h.Class(checkboxLabelClassName)],
                  ['I agree to the terms and conditions'],
                ),
              ],
            ),
            h.p(
              [
                ...attributes.description,
                h.Class(checkboxDescriptionClassName),
              ],
              ['You agree to our Terms of Service and Privacy Policy.'],
            ),
          ],
        ),
    },
    h,
  )

// DISABLED FIELDS

const disabledNameInput = (h: HtmlBuilder<UiMessage>): Html =>
  Input.view(
    {
      id: 'fieldset-disabled-name-input',
      isDisabled: true,
      value: 'Ada Lovelace',
      toView: attributes =>
        h.div(
          [h.Class(fieldClassName)],
          [
            h.label([...attributes.label, h.Class(labelClassName)], ['Name']),
            h.input([...attributes.input, h.Class(inputClassName)]),
          ],
        ),
    },
    h,
  )

const disabledBioTextarea = (h: HtmlBuilder<UiMessage>): Html =>
  Textarea.view(
    {
      id: 'fieldset-disabled-bio-textarea',
      isDisabled: true,
      value:
        "Mathematician and writer, known for work on Charles Babbage's Analytical Engine.",
      rows: 3,
      toView: attributes =>
        h.div(
          [h.Class(fieldClassName)],
          [
            h.label([...attributes.label, h.Class(labelClassName)], ['Bio']),
            h.textarea([...attributes.textarea, h.Class(textareaClassName)]),
          ],
        ),
    },
    h,
  )

const disabledTermsCheckbox = (h: HtmlBuilder<UiMessage>): Html =>
  Checkbox.view(
    {
      id: FIELDSET_DISABLED_CHECKBOX_ID,
      isChecked: true,
      isDisabled: true,
      onToggle: isChecked => ToggledFieldsetCheckboxDemo({ isChecked }),
      toView: attributes =>
        h.div(
          [h.Class('flex items-center gap-2')],
          [
            h.button(
              [...attributes.checkbox, h.Class(checkboxClassName)],
              [checkmark(h)],
            ),
            h.label(
              [...attributes.label, h.Class(checkboxLabelClassName)],
              ['I agree to the terms and conditions'],
            ),
          ],
        ),
    },
    h,
  )

// DEMOS

const basicDemo = (model: UiModel, h: HtmlBuilder<UiMessage>): Html =>
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
              [
                ...attributes.description,
                h.Class(`${descriptionClassName} mt-1`),
              ],
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
  )

const disabledDemo = (h: HtmlBuilder<UiMessage>): Html =>
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
              [
                ...attributes.description,
                h.Class(`${descriptionClassName} mt-1`),
              ],
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
  )

// VIEW

export const view = Submodel.defineView<UiModel, UiMessage>(
  (model, h): Html => {
    return h.div(
      [],
      [
        h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Fieldset']),

        h.h3([h.Class(sectionHeadingClassName)], ['Basic']),
        basicDemo(model, h),

        h.h3([h.Class(sectionHeadingClassName)], ['Disabled']),
        disabledDemo(h),
      ],
    )
  },
)
