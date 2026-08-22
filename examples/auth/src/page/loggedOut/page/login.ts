import { clsx } from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'
import { Command, Submodel, type Update } from 'foldkit'
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  allValid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

import { Session } from '../../../domain/session'
import { homeRouter } from '../../../route'

// MODEL

export const Model = S.Struct({
  email: Field(S.String),
  password: Field(S.String),
  isSubmitting: S.Boolean,
})

export type Model = typeof Model.Type

export const initModel = (): Model => ({
  email: NotValidated({ value: '' }),
  password: NotValidated({ value: '' }),
  isSubmitting: false,
})

// MESSAGE

export const Message = defineMessageUnion({
  ChangedEmail: { value: S.String },
  ChangedPassword: { value: S.String },
  SubmittedForm: {},
  SucceededSimulateAuthRequest: { session: Session },
  FailedSimulateAuthRequest: { error: S.String },
})

export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  SucceededLogin: { session: Session },
})

export type OutMessage = typeof OutMessage.Type

// VALIDATION

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

// UPDATE

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

export const SimulateAuthRequest = Command.define('SimulateAuthRequest', {
  args: { email: S.String, password: S.String },
  messages: [
    Message.SucceededSimulateAuthRequest,
    Message.FailedSimulateAuthRequest,
  ],
  execute: ({ email, password }) =>
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
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedEmail: ({ value }) => ({
      model: evo(model, { email: () => validateEmail(value) }),
    }),

    ChangedPassword: ({ value }) => ({
      model: evo(model, { password: () => validatePassword(value) }),
    }),

    SubmittedForm: () => {
      if (model.isSubmitting) {
        return { model }
      }

      if (!isFormValid(model)) {
        return { model }
      }

      return {
        model: evo(model, { isSubmitting: () => true }),
        commands: [
          SimulateAuthRequest({
            email: model.email.value,
            password: model.password.value,
          }),
        ],
      }
    },

    SucceededSimulateAuthRequest: ({ session }) => ({
      model,
      outMessage: OutMessage.SucceededLogin({ session }),
    }),

    FailedSimulateAuthRequest: ({ error }) => ({
      model: evo(model, {
        password: () =>
          Invalid({
            value: model.password.value,
            errors: [error],
          }),
        isSubmitting: () => false,
      }),
    }),
  })

// VIEW

const fieldToBorderClass = (field: Field<string>) =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    }),
  )

const fieldView = (
  id: string,
  labelText: string,
  field: Field<string>,
  onUpdate: (value: string) => Message,
  type: 'text' | 'email' | 'password',
  placeholder: string,
  h: HtmlBuilder<Message>,
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
                M.value(field).pipe(
                  M.tagsExhaustive({
                    NotValidated: () => h.empty,
                    Validating: () =>
                      h.span([h.Class('text-blue-600 text-sm')], ['...']),
                    Valid: () =>
                      h.span([h.Class('text-green-600 text-sm')], ['✓']),
                    Invalid: () => h.empty,
                  }),
                ),
              ],
            ),
            h.input([...attributes.input, h.Class(inputClass)]),
            M.value(field).pipe(
              M.tagsExhaustive({
                NotValidated: () => h.empty,
                Validating: () => h.empty,
                Valid: () => h.empty,
                Invalid: ({ errors }) =>
                  h.div(
                    [
                      ...attributes.description,
                      h.Class('text-red-600 text-sm mt-1'),
                    ],
                    [Array.headNonEmpty(errors)],
                  ),
              }),
            ),
          ],
        ),
    },
    h,
  )
}

export const view = Submodel.defineView<Model, Message>((model, h) => {
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
