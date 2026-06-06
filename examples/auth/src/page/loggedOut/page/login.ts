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
import { Command, Submodel } from 'foldkit'
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  allValid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

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

export const ChangedEmail = m('ChangedEmail', { value: S.String })
export const ChangedPassword = m('ChangedPassword', { value: S.String })
export const SubmittedForm = m('SubmittedForm')
export const SucceededSimulateAuthRequest = m('SucceededSimulateAuthRequest', {
  session: Session,
})
export const FailedSimulateAuthRequest = m('FailedSimulateAuthRequest', {
  error: S.String,
})

export const Message = S.Union([
  ChangedEmail,
  ChangedPassword,
  SubmittedForm,
  SucceededSimulateAuthRequest,
  FailedSimulateAuthRequest,
])
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededLogin = m('SucceededLogin', { session: Session })
export const OutMessage = S.Union([SucceededLogin])
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

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const SimulateAuthRequest = Command.define(
  'SimulateAuthRequest',
  { email: S.String, password: S.String },
  SucceededSimulateAuthRequest,
  FailedSimulateAuthRequest,
)(({ email, password }) =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.seconds(1))

    if (password !== 'password') {
      return FailedSimulateAuthRequest({ error: 'Invalid credentials' })
    }

    const name = pipe(
      email,
      String.split('@'),
      Array.head,
      Option.getOrElse(() => email),
    )

    const session: Session = { userId: '1', email, name }

    return SucceededSimulateAuthRequest({ session })
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

      SubmittedForm: () => {
        if (!isFormValid(model)) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, { isSubmitting: () => true }),
          [
            SimulateAuthRequest({
              email: model.email.value,
              password: model.password.value,
            }),
          ],
          Option.none(),
        ]
      },

      SucceededSimulateAuthRequest: ({ session }) => [
        model,
        [],
        Option.some(SucceededLogin({ session })),
      ],

      FailedSimulateAuthRequest: ({ error }) => [
        evo(model, {
          password: () =>
            Invalid({
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
  type: 'text' | 'email' | 'password' = 'text',
  placeholder = '',
): Html => {
  const h = html<Message>()

  const inputClass = clsx(
    'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    fieldToBorderClass(field),
  )

  return h.div(
    [],
    [
      h.div(
        [h.Class('flex items-center gap-2 mb-1')],
        [
          h.label(
            [h.For(id), h.Class('block text-sm font-medium text-gray-700')],
            [labelText],
          ),
          M.value(field).pipe(
            M.tagsExhaustive({
              NotValidated: () => h.empty,
              Validating: () =>
                h.span([h.Class('text-blue-600 text-sm')], ['...']),
              Valid: () => h.span([h.Class('text-green-600 text-sm')], ['✓']),
              Invalid: () => h.empty,
            }),
          ),
        ],
      ),
      h.input([
        h.Id(id),
        h.Type(type),
        h.Value(field.value),
        h.Placeholder(placeholder),
        h.Class(inputClass),
        h.OnInput(onUpdate),
      ]),
      M.value(field).pipe(
        M.tagsExhaustive({
          NotValidated: () => h.empty,
          Validating: () => h.empty,
          Valid: () => h.empty,
          Invalid: ({ errors }) =>
            h.div(
              [h.Class('text-red-600 text-sm mt-1')],
              [Array.headNonEmpty(errors)],
            ),
        }),
      ),
    ],
  )
}

export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()

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
            [h.Class('space-y-6'), h.OnSubmit(SubmittedForm())],
            [
              fieldView(
                'email',
                'Email',
                model.email,
                value => ChangedEmail({ value }),
                'email',
                'you@example.com',
              ),
              fieldView(
                'password',
                'Password',
                model.password,
                value => ChangedPassword({ value }),
                'password',
                'Enter your password',
              ),
              h.button(
                [
                  h.Type('submit'),
                  h.Disabled(!canSubmit),
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
