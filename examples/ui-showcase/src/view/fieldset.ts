import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import {
  Class,
  button,
  div,
  fieldset,
  h2,
  h3,
  input,
  label,
  legend,
  p,
  span,
  textarea,
} from '../html'
import type { Message as ParentMessage } from '../main'
import {
  GotFieldsetCheckboxDemoMessage,
  type UiMessage,
  UpdatedFieldsetInputValue,
  UpdatedFieldsetTextareaValue,
} from '../message'
import type { UiModel } from '../model'

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

const checkmark = span([Class('text-white text-xs')], ['\u2713'])

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Fieldset']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      Ui.Fieldset.view<ParentMessage>({
        id: 'fieldset-basic-demo',
        toView: attributes =>
          fieldset(
            [...attributes.fieldset, Class(fieldsetClassName)],
            [
              legend(
                [...attributes.legend, Class(legendClassName)],
                ['Personal Information'],
              ),
              span(
                [
                  ...attributes.description,
                  Class(`${descriptionClassName} mt-1`),
                ],
                ['We just need a few details.'],
              ),
              div(
                [Class('mt-4 flex flex-col gap-4')],
                [
                  Ui.Input.view({
                    id: 'fieldset-name-input',
                    value: model.fieldsetInputValue,
                    onInput: value =>
                      toMessage(UpdatedFieldsetInputValue({ value })),
                    placeholder: 'Enter your full name',
                    toView: inputAttributes =>
                      div(
                        [Class('flex flex-col gap-1.5')],
                        [
                          label(
                            [...inputAttributes.label, Class(labelClassName)],
                            ['Name'],
                          ),
                          input([
                            ...inputAttributes.input,
                            Class(inputClassName),
                          ]),
                          span(
                            [
                              ...inputAttributes.description,
                              Class(descriptionClassName),
                            ],
                            ['As it appears on your government-issued ID.'],
                          ),
                        ],
                      ),
                  }),
                  Ui.Textarea.view({
                    id: 'fieldset-bio-textarea',
                    value: model.fieldsetTextareaValue,
                    onInput: value =>
                      toMessage(UpdatedFieldsetTextareaValue({ value })),
                    placeholder: 'Tell us about yourself...',
                    rows: 3,
                    toView: textareaAttributes =>
                      div(
                        [Class('flex flex-col gap-1.5')],
                        [
                          label(
                            [
                              ...textareaAttributes.label,
                              Class(labelClassName),
                            ],
                            ['Bio'],
                          ),
                          textarea(
                            [
                              ...textareaAttributes.textarea,
                              Class(textareaClassName),
                            ],
                            [],
                          ),
                          span(
                            [
                              ...textareaAttributes.description,
                              Class(descriptionClassName),
                            ],
                            ['A brief introduction about yourself.'],
                          ),
                        ],
                      ),
                  }),
                  Ui.Checkbox.view({
                    model: model.fieldsetCheckboxDemo,
                    toMessage: message =>
                      toMessage(GotFieldsetCheckboxDemoMessage({ message })),
                    toView: checkboxAttributes =>
                      div(
                        [Class('flex flex-col gap-1')],
                        [
                          div(
                            [Class('flex items-center gap-2')],
                            [
                              button(
                                [
                                  ...checkboxAttributes.checkbox,
                                  Class(checkboxClassName),
                                ],
                                model.fieldsetCheckboxDemo.isChecked
                                  ? [checkmark]
                                  : [],
                              ),
                              label(
                                [
                                  ...checkboxAttributes.label,
                                  Class(checkboxLabelClassName),
                                ],
                                ['I agree to the terms and conditions'],
                              ),
                            ],
                          ),
                          p(
                            [
                              ...checkboxAttributes.description,
                              Class(checkboxDescriptionClassName),
                            ],
                            [
                              'You agree to our Terms of Service and Privacy Policy.',
                            ],
                          ),
                        ],
                      ),
                  }),
                ],
              ),
            ],
          ),
      }),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Ui.Fieldset.view<ParentMessage>({
        id: 'fieldset-disabled-demo',
        isDisabled: true,
        toView: attributes =>
          fieldset(
            [...attributes.fieldset, Class(fieldsetClassName)],
            [
              legend(
                [...attributes.legend, Class(legendClassName)],
                ['Personal Information'],
              ),
              span(
                [
                  ...attributes.description,
                  Class(`${descriptionClassName} mt-1`),
                ],
                ['This fieldset is disabled.'],
              ),
              div(
                [Class('mt-4 flex flex-col gap-4')],
                [
                  Ui.Input.view<ParentMessage>({
                    id: 'fieldset-disabled-name-input',
                    isDisabled: true,
                    value: 'Ada Lovelace',
                    toView: inputAttributes =>
                      div(
                        [Class('flex flex-col gap-1.5')],
                        [
                          label(
                            [...inputAttributes.label, Class(labelClassName)],
                            ['Name'],
                          ),
                          input([
                            ...inputAttributes.input,
                            Class(inputClassName),
                          ]),
                        ],
                      ),
                  }),
                  Ui.Textarea.view<ParentMessage>({
                    id: 'fieldset-disabled-bio-textarea',
                    isDisabled: true,
                    value:
                      "Mathematician and writer, known for work on Charles Babbage's Analytical Engine.",
                    rows: 3,
                    toView: textareaAttributes =>
                      div(
                        [Class('flex flex-col gap-1.5')],
                        [
                          label(
                            [
                              ...textareaAttributes.label,
                              Class(labelClassName),
                            ],
                            ['Bio'],
                          ),
                          textarea(
                            [
                              ...textareaAttributes.textarea,
                              Class(textareaClassName),
                            ],
                            [],
                          ),
                        ],
                      ),
                  }),
                  Ui.Checkbox.view({
                    model: {
                      id: 'fieldset-disabled-checkbox',
                      isChecked: true,
                    },
                    isDisabled: true,
                    toMessage: message =>
                      toMessage(GotFieldsetCheckboxDemoMessage({ message })),
                    toView: checkboxAttributes =>
                      div(
                        [Class('flex items-center gap-2')],
                        [
                          button(
                            [
                              ...checkboxAttributes.checkbox,
                              Class(checkboxClassName),
                            ],
                            [checkmark],
                          ),
                          label(
                            [
                              ...checkboxAttributes.label,
                              Class(checkboxLabelClassName),
                            ],
                            ['I agree to the terms and conditions'],
                          ),
                        ],
                      ),
                  }),
                ],
              ),
            ],
          ),
      }),
    ],
  )
