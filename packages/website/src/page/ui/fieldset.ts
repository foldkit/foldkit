import { Ui } from 'foldkit'

import {
  Class,
  button,
  div,
  fieldset,
  input,
  label,
  legend,
  p,
  span,
  textarea,
} from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import {
  GotFieldsetCheckboxDemoMessage,
  type Message,
  UpdatedFieldsetInputValue,
  UpdatedFieldsetTextareaValue,
} from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic',
  text: 'Basic',
}

export const disabledHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'disabled',
  text: 'Disabled',
}

// SHARED STYLES

const fieldsetClassName =
  'rounded-lg border border-gray-200 p-6 dark:border-gray-700'

const legendClassName =
  'float-left w-full text-base font-semibold text-gray-900 dark:text-white'

const descriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

const labelClassName =
  'block text-sm font-medium text-gray-700 dark:text-gray-300'

const inputClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-accent-400 dark:focus:ring-accent-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const textareaClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-accent-400 dark:focus:ring-accent-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const checkboxClassName =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 dark:border-gray-500 cursor-pointer data-[checked]:bg-accent-600 data-[checked]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const checkboxLabelClassName =
  'text-sm font-normal text-gray-900 dark:text-white cursor-pointer select-none'

const checkboxDescriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

const checkmark = span([Class('text-white text-xs')], ['\u2713'])

// VIEW

export const basicDemo = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', basicHeader.id, basicHeader.text),
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
            [...attributes.description, Class(`${descriptionClassName} mt-1`)],
            ['We just need a few details.'],
          ),
          div(
            [Class('mt-4 flex flex-col gap-4')],
            [
              Ui.Input.view({
                id: 'fieldset-name-input',
                value: model.fieldsetInputValue,
                onInput: value =>
                  toParentMessage(UpdatedFieldsetInputValue({ value })),
                placeholder: 'Enter your full name',
                toView: inputAttributes =>
                  div(
                    [Class('flex flex-col gap-1.5')],
                    [
                      label(
                        [...inputAttributes.label, Class(labelClassName)],
                        ['Name'],
                      ),
                      input([...inputAttributes.input, Class(inputClassName)]),
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
                  toParentMessage(UpdatedFieldsetTextareaValue({ value })),
                placeholder: 'Tell us about yourself...',
                rows: 3,
                toView: textareaAttributes =>
                  div(
                    [Class('flex flex-col gap-1.5')],
                    [
                      label(
                        [...textareaAttributes.label, Class(labelClassName)],
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
                toParentMessage: message =>
                  toParentMessage(GotFieldsetCheckboxDemoMessage({ message })),
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
]

export const disabledDemo = (
  _model: Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', disabledHeader.id, disabledHeader.text),
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
            [...attributes.description, Class(`${descriptionClassName} mt-1`)],
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
                      input([...inputAttributes.input, Class(inputClassName)]),
                    ],
                  ),
              }),
              Ui.Textarea.view<ParentMessage>({
                id: 'fieldset-disabled-bio-textarea',
                isDisabled: true,
                value:
                  'Mathematician and writer, known for work on Charles Babbage\u2019s Analytical Engine.',
                rows: 3,
                toView: textareaAttributes =>
                  div(
                    [Class('flex flex-col gap-1.5')],
                    [
                      label(
                        [...textareaAttributes.label, Class(labelClassName)],
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
                toParentMessage: message =>
                  toParentMessage(GotFieldsetCheckboxDemoMessage({ message })),
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
]
