import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../../main'
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

const fieldsetClassName = 'w-full p-6'

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

// VIEW

export const basicDemo = (model: Model) => {
  const h = html<Message>()

  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])

  return [
    Ui.Fieldset.view<Message>({
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
              [h.Class('mt-4 flex flex-col gap-4')],
              [
                Ui.Input.view({
                  id: 'fieldset-name-input',
                  value: model.fieldsetInputValue,
                  onInput: value => UpdatedFieldsetInputValue({ value }),
                  placeholder: 'Enter your full name',
                  toView: inputAttributes =>
                    h.div(
                      [h.Class('flex flex-col gap-1.5')],
                      [
                        h.label(
                          [...inputAttributes.label, h.Class(labelClassName)],
                          ['Name'],
                        ),
                        h.input([
                          ...inputAttributes.input,
                          h.Class(inputClassName),
                        ]),
                        h.span(
                          [
                            ...inputAttributes.description,
                            h.Class(descriptionClassName),
                          ],
                          ['As it appears on your government-issued ID.'],
                        ),
                      ],
                    ),
                }),
                Ui.Textarea.view({
                  id: 'fieldset-bio-textarea',
                  value: model.fieldsetTextareaValue,
                  onInput: value => UpdatedFieldsetTextareaValue({ value }),
                  placeholder: 'Tell us about yourself...',
                  rows: 3,
                  toView: textareaAttributes =>
                    h.div(
                      [h.Class('flex flex-col gap-1.5')],
                      [
                        h.label(
                          [
                            ...textareaAttributes.label,
                            h.Class(labelClassName),
                          ],
                          ['Bio'],
                        ),
                        h.textarea(
                          [
                            ...textareaAttributes.textarea,
                            h.Class(textareaClassName),
                          ],
                          [],
                        ),
                        h.span(
                          [
                            ...textareaAttributes.description,
                            h.Class(descriptionClassName),
                          ],
                          ['A brief introduction about yourself.'],
                        ),
                      ],
                    ),
                }),
                h.submodel({
                  slotId: 'fieldset-checkbox-demo',
                  model: model.fieldsetCheckboxDemo,
                  view: Ui.Checkbox.view,
                  viewInputs: {
                    toView: checkboxAttributes =>
                      h.div(
                        [h.Class('flex flex-col gap-1')],
                        [
                          h.div(
                            [h.Class('flex items-center gap-2')],
                            [
                              h.button(
                                [
                                  ...checkboxAttributes.checkbox,
                                  h.Class(checkboxClassName),
                                ],
                                model.fieldsetCheckboxDemo.isChecked
                                  ? [checkmark]
                                  : [],
                              ),
                              h.label(
                                [
                                  ...checkboxAttributes.label,
                                  h.Class(checkboxLabelClassName),
                                ],
                                ['I agree to the terms and conditions'],
                              ),
                            ],
                          ),
                          h.p(
                            [
                              ...checkboxAttributes.description,
                              h.Class(checkboxDescriptionClassName),
                            ],
                            [
                              'You agree to our Terms of Service and Privacy Policy.',
                            ],
                          ),
                        ],
                      ),
                  },
                  toParentMessage: message =>
                    GotFieldsetCheckboxDemoMessage({ message }),
                }),
              ],
            ),
          ],
        ),
    }),
  ]
}

export const disabledDemo = (_model: Model) => {
  const h = html<Message>()

  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])

  return [
    Ui.Fieldset.view<Message>({
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
              [h.Class('mt-4 flex flex-col gap-4')],
              [
                Ui.Input.view<Message>({
                  id: 'fieldset-disabled-name-input',
                  isDisabled: true,
                  value: 'Ada Lovelace',
                  toView: inputAttributes =>
                    h.div(
                      [h.Class('flex flex-col gap-1.5')],
                      [
                        h.label(
                          [...inputAttributes.label, h.Class(labelClassName)],
                          ['Name'],
                        ),
                        h.input([
                          ...inputAttributes.input,
                          h.Class(inputClassName),
                        ]),
                      ],
                    ),
                }),
                Ui.Textarea.view<Message>({
                  id: 'fieldset-disabled-bio-textarea',
                  isDisabled: true,
                  value:
                    'Mathematician and writer, known for work on Charles Babbage’s Analytical Engine.',
                  rows: 3,
                  toView: textareaAttributes =>
                    h.div(
                      [h.Class('flex flex-col gap-1.5')],
                      [
                        h.label(
                          [
                            ...textareaAttributes.label,
                            h.Class(labelClassName),
                          ],
                          ['Bio'],
                        ),
                        h.textarea(
                          [
                            ...textareaAttributes.textarea,
                            h.Class(textareaClassName),
                          ],
                          [],
                        ),
                      ],
                    ),
                }),
                h.submodel({
                  slotId: 'fieldset-disabled-checkbox',
                  model: {
                    id: 'fieldset-disabled-checkbox',
                    isChecked: true,
                  },
                  view: Ui.Checkbox.view,
                  viewInputs: {
                    isDisabled: true,
                    toView: checkboxAttributes =>
                      h.div(
                        [h.Class('flex items-center gap-2')],
                        [
                          h.button(
                            [
                              ...checkboxAttributes.checkbox,
                              h.Class(checkboxClassName),
                            ],
                            [checkmark],
                          ),
                          h.label(
                            [
                              ...checkboxAttributes.label,
                              h.Class(checkboxLabelClassName),
                            ],
                            ['I agree to the terms and conditions'],
                          ),
                        ],
                      ),
                  },
                  toParentMessage: message =>
                    GotFieldsetCheckboxDemoMessage({ message }),
                }),
              ],
            ),
          ],
        ),
    }),
  ]
}
