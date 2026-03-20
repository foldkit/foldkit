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
import { Command, FieldValidation } from 'foldkit'
import { type Validation, makeField } from 'foldkit/fieldValidation'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Session } from '../../../domain/session'
import {
  Class,
  Disabled,
  For,
  Href,
  Id,
  OnInput,
  OnSubmit,
  Placeholder,
  Type,
  Value,
  a,
  button,
  div,
  empty,
  form,
  h1,
  input,
  label,
  p,
  span,
} from '../../../html'
import type { Message as ParentMessage } from '../../../message'
import { homeRouter } from '../../../route'

// FIELD

const StringField = makeField(S.String)
type StringField = typeof StringField.Union.Type

const StringFieldInvalid = StringField.Invalid

// MODEL

export const Model = S.Struct({
  email: StringField.Union,
  password: StringField.Union,
  isSubmitting: S.Boolean,
})

export type Model = typeof Model.Type

export const initModel = (): Model => ({
  email: StringField.NotValidated({ value: '' }),
  password: StringField.NotValidated({ value: '' }),
  isSubmitting: false,
})

// MESSAGE

const ChangedEmail = m('ChangedEmail', { value: S.String })
const ChangedPassword = m('ChangedPassword', { value: S.String })
const ClickedSubmit = m('ClickedSubmit')
const SucceededAuth = m('SucceededAuth', { session: Session })
const FailedAuth = m('FailedAuth', { error: S.String })

export const Message = S.Union(
  ChangedEmail,
  ChangedPassword,
  ClickedSubmit,
  SucceededAuth,
  FailedAuth,
)
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededLogin = m('SucceededLogin', { session: Session })
export const OutMessage = S.Union(SucceededLogin)
export type OutMessage = typeof OutMessage.Type

// VALIDATION

const emailValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Email is required'),
  FieldValidation.email('Please enter a valid email'),
]

const passwordValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Password is required'),
]

const validateEmail = StringField.validate(emailValidations)
const validatePassword = StringField.validate(passwordValidations)

const isFormValid = (model: Model): boolean =>
  Array.every([model.email, model.password], field => field._tag === 'Valid')

// UPDATE

type UpdateReturn = [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const SimulateAuthRequest = Command.define('SimulateAuthRequest')

const simulateAuthRequest = (email: string, password: string) =>
  SimulateAuthRequest(
    Effect.gen(function* () {
      yield* Effect.sleep(Duration.seconds(1))

      if (password !== 'password') {
        return FailedAuth({ error: 'Invalid credentials' })
      }

      const name = pipe(
        email,
        String.split('@'),
        Array.head,
        Option.getOrElse(() => email),
      )

      const session: Session = { userId: '1', email, name }

      return SucceededAuth({ session })
    }),
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ChangedEmail: ({ value }) => [
        evo(model, { email: () => validateEmail(value) }),
        [],
        Option.none(),
      ],

      ChangedPassword: ({ value }) => [
        evo(model, { password: () => validatePassword(value) }),
        [],
        Option.none(),
      ],

      ClickedSubmit: () => {
        if (!isFormValid(model)) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, { isSubmitting: () => true }),
          [simulateAuthRequest(model.email.value, model.password.value)],
          Option.none(),
        ]
      },

      SucceededAuth: ({ session }) => [
        model,
        [],
        Option.some(SucceededLogin({ session })),
      ],

      FailedAuth: ({ error }) => [
        evo(model, {
          password: () =>
            StringFieldInvalid({
              value: model.password.value,
              errors: [error],
            }),
          isSubmitting: () => false,
        }),
        [],
        Option.none(),
      ],
    }),
  )

// VIEW

const fieldToBorderClass = (field: StringField) =>
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
  field: StringField,
  onUpdate: (value: string) => ParentMessage,
  type: 'text' | 'email' | 'password' = 'text',
  placeholder = '',
): Html => {
  const inputClass = clsx(
    'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    fieldToBorderClass(field),
  )

  return div(
    [],
    [
      div(
        [Class('flex items-center gap-2 mb-1')],
        [
          label(
            [For(id), Class('block text-sm font-medium text-gray-700')],
            [labelText],
          ),
          M.value(field).pipe(
            M.tagsExhaustive({
              NotValidated: () => empty,
              Validating: () => span([Class('text-blue-600 text-sm')], ['...']),
              Valid: () => span([Class('text-green-600 text-sm')], ['✓']),
              Invalid: () => empty,
            }),
          ),
        ],
      ),
      input([
        Id(id),
        Type(type),
        Value(field.value),
        Placeholder(placeholder),
        Class(inputClass),
        OnInput(onUpdate),
      ]),
      M.value(field).pipe(
        M.tagsExhaustive({
          NotValidated: () => empty,
          Validating: () => empty,
          Valid: () => empty,
          Invalid: ({ errors }) =>
            div(
              [Class('text-red-600 text-sm mt-1')],
              [Array.headNonEmpty(errors)],
            ),
        }),
      ),
    ],
  )
}

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const canSubmit = isFormValid(model) && !model.isSubmitting

  return div(
    [Class('max-w-md mx-auto px-4')],
    [
      div(
        [Class('bg-white rounded-xl shadow-lg p-8')],
        [
          h1(
            [Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Sign In'],
          ),
          div(
            [Class('mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg')],
            [
              p(
                [Class('text-sm text-blue-700')],
                ['Hint: Use any email with password "password"'],
              ),
            ],
          ),
          form(
            [Class('space-y-6'), OnSubmit(toMessage(ClickedSubmit()))],
            [
              fieldView(
                'email',
                'Email',
                model.email,
                value => toMessage(ChangedEmail({ value })),
                'email',
                'you@example.com',
              ),
              fieldView(
                'password',
                'Password',
                model.password,
                value => toMessage(ChangedPassword({ value })),
                'password',
                'Enter your password',
              ),
              button(
                [
                  Type('submit'),
                  Disabled(!canSubmit),
                  Class(
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
            ],
          ),
          div(
            [Class('mt-6 text-center')],
            [
              span([Class('text-gray-600')], ['Back to ']),
              a(
                [Href(homeRouter()), Class('text-blue-500 hover:underline')],
                ['Home'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
