import { clsx } from 'clsx'
import { Array, Duration, Effect, Option, Schema, String, pipe } from 'effect'
import { Block, Command, FieldValidation } from 'foldkit'
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  allValid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

import { Session } from '../../domain/session'
import { homeRouter } from '../../route'

const Model = Schema.Struct({
  email: Field(Schema.String),
  password: Field(Schema.String),
  isSubmitting: Schema.Boolean,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedEmail: { value: Schema.String },
  ChangedPassword: { value: Schema.String },
  SubmittedForm: {},
  SucceededSimulateAuthRequest: { session: Session },
  FailedSimulateAuthRequest: { error: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  SucceededLogin: { session: Session },
})

export const initModel = (): Model => ({
  email: NotValidated({ value: '' }),
  password: NotValidated({ value: '' }),
  isSubmitting: false,
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email')],
})

const passwordRules = makeRules({
  required: 'Password is required',
})

const validateEmail = validate(emailRules)
const validatePassword = validate(passwordRules)

const isFormValid = (model: Model): boolean =>
  allValid([
    [model.email, emailRules],
    [model.password, passwordRules],
  ])

export const SimulateAuthRequest = Command.define('SimulateAuthRequest', {
  args: { email: Schema.String, password: Schema.String },
  messages: [
    Message.SucceededSimulateAuthRequest,
    Message.FailedSimulateAuthRequest,
  ],
})

export class Login extends Block<Login>()('Login', {
  Model,
  Message,
  OutMessage,
  Command: [SimulateAuthRequest],
}) {}

export const LoginLive = Login.make(
  Effect.fn(function* () {
    return {
      model: initModel(),

      update: {
        ChangedEmail: (model, { value }) => ({
          model: modifyFields(model, { email: () => validateEmail(value) }),
        }),

        ChangedPassword: (model, { value }) => ({
          model: modifyFields(model, {
            password: () => validatePassword(value),
          }),
        }),

        SubmittedForm: model => {
          if (model.isSubmitting) {
            return { model }
          }

          if (!isFormValid(model)) {
            return { model }
          }

          return {
            model: modifyFields(model, { isSubmitting: () => true }),
            commands: [
              SimulateAuthRequest({
                email: model.email.value,
                password: model.password.value,
              }),
            ],
          }
        },

        SucceededSimulateAuthRequest: (model, { session }) => ({
          model,
          outMessage: OutMessage.SucceededLogin({ session }),
        }),

        FailedSimulateAuthRequest: (model, { error }) => ({
          model: modifyFields(model, {
            password: () =>
              Invalid({
                value: model.password.value,
                errors: [error],
              }),
            isSubmitting: () => false,
          }),
        }),
      },

      commands: {
        SimulateAuthRequest: ({ email, password }) =>
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.seconds(1))

            if (password !== 'password') {
              return Message.FailedSimulateAuthRequest({
                error: 'Invalid credentials',
              })
            }

            const name = pipe(
              email,
              String.split('@'),
              Array.head,
              Option.getOrElse(() => email),
            )
            const session: Session = { userId: '1', email, name }
            return Message.SucceededSimulateAuthRequest({ session })
          }),
      },

      view,
    }
  }),
)

type LoginViewBuilder = HtmlBuilder<Message>

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

const view = (model: Model, h: LoginViewBuilder): Html => {
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
}
