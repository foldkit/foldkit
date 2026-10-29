import { clsx } from 'clsx'
import { Array } from 'effect'
import { FieldValidation } from 'foldkit'
import { type Field } from 'foldkit/fieldValidation'
import { type Html } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

import { homeRouter } from '../../../../route'
import { LoginComposition, type LoginViewBuilder } from './composition'
import { Message } from './definition'
import { isFormValid } from './login'

const fieldToBorderClass = (field: Field<string>) =>
  FieldValidation.match(field, {
    onNotValidated: () => 'border-gray-300',
    onValidating: () => 'border-blue-300',
    onValid: () => 'border-green-500',
    onInvalid: () => 'border-red-500',
  })

const fieldView = (
  id: string,
  labelText: string,
  field: Field<string>,
  onUpdate: (value: string) => Message,
  type: 'text' | 'email' | 'password',
  placeholder: string,
  h: LoginViewBuilder,
): Html => {
  const inputClass = clsx(
    'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    fieldToBorderClass(field),
  )

  return Input.view(
    {
      id,
      type,
      value: field.value,
      placeholder,
      onInput: onUpdate,
      isInvalid: field._tag === 'Invalid',
      hasDescription: field._tag === 'Invalid',
      toView: attributes =>
        h.div(
          [],
          [
            h.div(
              [h.Class('flex items-center gap-2 mb-1')],
              [
                h.label(
                  [
                    ...attributes.label,
                    h.Class('block text-sm font-medium text-gray-700'),
                  ],
                  [labelText],
                ),
                FieldValidation.match(field, {
                  onNotValidated: () => h.empty,
                  onValidating: () =>
                    h.span([h.Class('text-blue-600 text-sm')], ['...']),
                  onValid: () =>
                    h.span([h.Class('text-green-600 text-sm')], ['✓']),
                  onInvalid: () => h.empty,
                }),
              ],
            ),
            h.input([...attributes.input, h.Class(inputClass)]),
            FieldValidation.match(field, {
              onNotValidated: () => h.empty,
              onValidating: () => h.empty,
              onValid: () => h.empty,
              onInvalid: ({ errors }) =>
                h.div(
                  [
                    ...attributes.description,
                    h.Class('text-red-600 text-sm mt-1'),
                  ],
                  [Array.headNonEmpty(errors)],
                ),
            }),
          ],
        ),
    },
    h,
  )
}

export const view = LoginComposition.makeView((model, h) => {
  const canSubmit = isFormValid(model) && !model.isSubmitting

  return h.div(
    [h.Class('max-w-md mx-auto px-4')],
    [
      h.div(
        [h.Class('bg-white rounded-xl shadow-lg p-8')],
        [
          h.h1(
            [h.Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Sign In'],
          ),
          h.div(
            [h.Class('mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg')],
            [
              h.p(
                [h.Class('text-sm text-blue-700')],
                ['Hint: Use any email with password "password"'],
              ),
            ],
          ),
          h.form(
            [h.Class('space-y-6'), h.OnSubmit(Message.SubmittedForm())],
            [
              fieldView(
                'email',
                'Email',
                model.email,
                value => Message.ChangedEmail({ value }),
                'email',
                'you@example.com',
                h,
              ),
              fieldView(
                'password',
                'Password',
                model.password,
                value => Message.ChangedPassword({ value }),
                'password',
                'Enter your password',
                h,
              ),
              Button.view(
                {
                  type: 'submit',
                  isDisabled: !canSubmit,
                  toView: attributes =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
                          clsx(
                            'w-full py-3 font-medium rounded-lg transition',
                            canSubmit
                              ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed',
                          ),
                        ),
                      ],
                      [model.isSubmitting ? 'Signing in...' : 'Sign In'],
                    ),
                },
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('mt-6 text-center')],
            [
              h.span([h.Class('text-gray-600')], ['Back to ']),
              h.a(
                [
                  h.Href(homeRouter()),
                  h.Class('text-blue-500 hover:underline'),
                ],
                ['Home'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
})
