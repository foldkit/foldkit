import clsx from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number,
  Random,
  Schema as S,
} from 'effect'
import { Command, FieldValidation, Runtime, Ui } from 'foldkit'
import { type Validation, makeField } from 'foldkit/fieldValidation'
import { type Attribute, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const StringField = makeField(S.String)
type StringField = typeof StringField.Union.Type

// MODEL

const NotSubmitted = ts('NotSubmitted')
const Submitting = ts('Submitting')
const SubmitSuccess = ts('SubmitSuccess', { message: S.String })
const SubmitError = ts('SubmitError', { error: S.String })

const Submission = S.Union(NotSubmitted, Submitting, SubmitSuccess, SubmitError)

type NotSubmitted = typeof NotSubmitted.Type
type Submitting = typeof Submitting.Type
type SubmitSuccess = typeof SubmitSuccess.Type
type SubmitError = typeof SubmitError.Type
type Submission = typeof Submission.Type

const Model = S.Struct({
  name: StringField.Union,
  email: StringField.Union,
  emailValidationId: S.Number,
  message: StringField.Union,
  submission: Submission,
})
type Model = typeof Model.Type

// MESSAGE

const UpdatedName = m('UpdatedName', { value: S.String })
const UpdatedEmail = m('UpdatedEmail', { value: S.String })
const ValidatedEmail = m('ValidatedEmail', {
  validationId: S.Number,
  field: StringField.Union,
})
const UpdatedMessage = m('UpdatedMessage', { value: S.String })
const ClickedFormSubmit = m('ClickedFormSubmit')
const SubmittedForm = m('SubmittedForm', {
  success: S.Boolean,
  name: S.String,
  email: S.String,
  message: S.String,
})

const Message = S.Union(
  UpdatedName,
  UpdatedEmail,
  ValidatedEmail,
  UpdatedMessage,
  ClickedFormSubmit,
  SubmittedForm,
)
type Message = typeof Message.Type

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    name: StringField.NotValidated({ value: '' }),
    email: StringField.NotValidated({ value: '' }),
    emailValidationId: 0,
    message: StringField.NotValidated({ value: '' }),
    submission: NotSubmitted(),
  },
  [],
]

// FIELD VALIDATION

const nameValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.minLength(2, 'Name must be at least 2 characters'),
]

const emailValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Email is required'),
  FieldValidation.email('Please enter a valid email address'),
]

const EMAILS_ON_WAITLIST = [
  'test@example.com',
  'demo@email.com',
  'admin@test.com',
]

const isEmailOnWaitlist = (email: string): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(FAKE_API_DELAY_MS))
    return Array.contains(EMAILS_ON_WAITLIST, email.toLowerCase())
  })

const validateEmailNotOnWaitlist = (
  email: string,
  validationId: number,
): Command.Command<typeof ValidatedEmail> =>
  Effect.gen(function* () {
    if (yield* isEmailOnWaitlist(email)) {
      return ValidatedEmail({
        validationId,
        field: StringField.Invalid({
          value: email,
          errors: ['This email is already on our waitlist'],
        }),
      })
    } else {
      return ValidatedEmail({
        validationId,
        field: StringField.Valid({ value: email }),
      })
    }
  }).pipe(Command.make('ValidateEmailNotOnWaitlist'))

const validateName = StringField.validate(nameValidations)
const validateEmail = StringField.validate(emailValidations)

const isFormValid = (model: Model): boolean =>
  Array.every([model.name, model.email], field => field._tag === 'Valid')

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      UpdatedName: ({ value }) => [
        evo(model, {
          name: () => validateName(value),
        }),
        [],
      ],

      UpdatedEmail: ({ value }) => {
        const validateEmailResult = validateEmail(value)
        const validationId = Number.increment(model.emailValidationId)

        if (validateEmailResult._tag === 'Valid') {
          return [
            evo(model, {
              email: () => StringField.Validating({ value }),
              emailValidationId: () => validationId,
            }),
            [validateEmailNotOnWaitlist(value, validationId)],
          ]
        } else {
          return [
            evo(model, {
              email: () => validateEmailResult,
              emailValidationId: () => validationId,
            }),
            [],
          ]
        }
      },

      ValidatedEmail: ({ validationId, field }) => {
        if (validationId === model.emailValidationId) {
          return [
            evo(model, {
              email: () => field,
            }),
            [],
          ]
        } else {
          return [model, []]
        }
      },

      UpdatedMessage: ({ value }) => [
        evo(model, {
          message: () => StringField.Valid({ value }),
        }),
        [],
      ],

      ClickedFormSubmit: () => {
        if (!isFormValid(model)) {
          return [model, []]
        }

        return [
          evo(model, {
            submission: () => Submitting(),
          }),
          [submitForm(model)],
        ]
      },

      SubmittedForm: ({ success, name }) => {
        if (success) {
          return [
            evo(model, {
              submission: () =>
                SubmitSuccess({
                  message: `Welcome to the waitlist, ${name}! We'll be in touch soon.`,
                }),
            }),
            [],
          ]
        } else {
          return [
            evo(model, {
              submission: () =>
                SubmitError({
                  error:
                    'Sorry, there was an error adding you to the waitlist. Please try again.',
                }),
            }),
            [],
          ]
        }
      },
    }),
  )

// COMMAND

const FAKE_API_DELAY_MS = 500

const submitForm = (model: Model): Command.Command<typeof SubmittedForm> =>
  Effect.gen(function* () {
    yield* Effect.sleep(`${FAKE_API_DELAY_MS} millis`)

    const success = yield* Random.nextBoolean

    return SubmittedForm({
      success,
      name: model.name.value,
      email: model.name.value,
      message: model.message.value,
    })
  }).pipe(Command.make('SubmitForm'))

// VIEW

const {
  button,
  div,
  empty,
  form,
  h1,
  input,
  label,
  span,
  textarea,
  Class,
  Disabled,
  OnSubmit,
  Type,
} = html<Message>()

const LABEL_CLASS = 'text-sm font-medium text-gray-700'
const DESCRIPTION_CLASS = 'text-sm mt-1'

const borderClass = (field: StringField): string =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    }),
  )

const inputClassName = (field: StringField): string =>
  clsx(
    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    borderClass(field),
  )

const statusIndicator = (field: StringField): Html =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => empty,
      Validating: () =>
        span([Class('text-blue-600 text-sm animate-spin')], ['◐']),
      Valid: () => span([Class('text-green-600 text-sm')], ['✓']),
      Invalid: () => empty,
    }),
  )

const descriptionView = (
  field: StringField,
  descriptionAttributes: ReadonlyArray<Attribute<Message>>,
): Html =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => empty,
      Validating: () =>
        span(
          [
            ...descriptionAttributes,
            Class(clsx(DESCRIPTION_CLASS, 'text-blue-600')),
          ],
          ['Checking...'],
        ),
      Valid: () => empty,
      Invalid: ({ errors }) =>
        span(
          [
            ...descriptionAttributes,
            Class(clsx(DESCRIPTION_CLASS, 'text-red-600')),
          ],
          [Array.headNonEmpty(errors)],
        ),
    }),
  )

const inputFieldView = (
  id: string,
  labelText: string,
  field: StringField,
  onUpdate: (value: string) => Message,
  type: string = 'text',
): Html =>
  Ui.Input.view({
    id,
    value: field.value,
    onInput: onUpdate,
    isInvalid: field._tag === 'Invalid',
    type,
    toView: attributes =>
      div(
        [Class('mb-4')],
        [
          div(
            [Class('flex items-center gap-2 mb-2')],
            [
              label([...attributes.label, Class(LABEL_CLASS)], [labelText]),
              statusIndicator(field),
            ],
          ),
          input([...attributes.input, Class(inputClassName(field))]),
          descriptionView(field, attributes.description),
        ],
      ),
  })

const textareaFieldView = (
  id: string,
  labelText: string,
  field: StringField,
  onUpdate: (value: string) => Message,
): Html =>
  Ui.Textarea.view({
    id,
    value: field.value,
    onInput: onUpdate,
    isInvalid: field._tag === 'Invalid',
    toView: attributes =>
      div(
        [Class('mb-4')],
        [
          div(
            [Class('flex items-center gap-2 mb-2')],
            [
              label([...attributes.label, Class(LABEL_CLASS)], [labelText]),
              statusIndicator(field),
            ],
          ),
          textarea([...attributes.textarea, Class(inputClassName(field))], []),
          descriptionView(field, attributes.description),
        ],
      ),
  })

const view = (model: Model): Html => {
  const canSubmit = isFormValid(model) && model.submission._tag !== 'Submitting'

  return div(
    [Class('min-h-screen bg-gray-100 py-8')],
    [
      div(
        [Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h1(
            [Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Join Our Waitlist'],
          ),

          form(
            [Class('space-y-4'), OnSubmit(ClickedFormSubmit())],
            [
              inputFieldView('name', 'Name', model.name, value =>
                UpdatedName({ value }),
              ),
              inputFieldView(
                'email',
                'Email',
                model.email,
                value => UpdatedEmail({ value }),
                'email',
              ),
              textareaFieldView(
                'message',
                "Anything you'd like to share with us?",
                model.message,
                value => UpdatedMessage({ value }),
              ),

              button(
                [
                  Type('submit'),
                  Disabled(!canSubmit),
                  Class(
                    clsx(
                      'w-full py-2 px-4 rounded-md transition',
                      canSubmit
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed',
                    ),
                  ),
                ],
                [
                  model.submission._tag === 'Submitting'
                    ? 'Joining...'
                    : 'Join Waitlist',
                ],
              ),
            ],
          ),

          M.value(model.submission).pipe(
            M.tagsExhaustive({
              NotSubmitted: () => empty,
              Submitting: () => empty,
              SubmitSuccess: ({ message }) =>
                div(
                  [
                    Class(
                      'mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg',
                    ),
                  ],
                  [message],
                ),
              SubmitError: ({ error }) =>
                div(
                  [
                    Class(
                      'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg',
                    ),
                  ],
                  [error],
                ),
            }),
          ),
        ],
      ),
    ],
  )
}

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
