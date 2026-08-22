import clsx from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Random,
  Schema as S,
} from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  Valid,
  Validating,
  allValid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { type Attribute, Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { Button, Input, Textarea } from '@foldkit/ui'

const nameRules = makeRules({
  rules: [Rule.minLength(2, 'Name must be at least 2 characters')],
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

// MODEL

const NotSubmitted = ts('NotSubmitted')
const Submitting = ts('Submitting')
const SubmitSuccess = ts('SubmitSuccess', { confirmationText: S.String })
const SubmitError = ts('SubmitError', { error: S.String })

const Submission = S.Union([
  NotSubmitted,
  Submitting,
  SubmitSuccess,
  SubmitError,
])

type NotSubmitted = typeof NotSubmitted.Type
type Submitting = typeof Submitting.Type
type SubmitSuccess = typeof SubmitSuccess.Type
type SubmitError = typeof SubmitError.Type
type Submission = typeof Submission.Type

export const Model = S.Struct({
  name: Field(S.String),
  email: Field(S.String),
  messageText: Field(S.String),
  submission: Submission,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedName: { value: S.String },
  UpdatedEmail: { value: S.String },
  CompletedValidateEmail: { field: Field(S.String) },
  UpdatedMessageText: { value: S.String },
  ClickedFormSubmit: {},
  SucceededSubmitForm: { name: S.String },
  FailedSubmitForm: {},
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  name: NotValidated({ value: '' }),
  email: NotValidated({ value: '' }),
  messageText: NotValidated({ value: '' }),
  submission: NotSubmitted(),
}

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: initialModel,
})

// FIELD VALIDATION

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

export const ValidateEmail = Command.define('ValidateEmail', {
  args: { email: S.String },
  messages: [Message.CompletedValidateEmail],
  execute: ({ email }) =>
    Effect.gen(function* () {
      if (yield* isEmailOnWaitlist(email)) {
        return Message.CompletedValidateEmail({
          field: Invalid({
            value: email,
            errors: ['This email is already on our waitlist'],
          }),
        })
      } else {
        return Message.CompletedValidateEmail({
          field: Valid({ value: email }),
        })
      }
    }),
})

const validateName = validate(nameRules)
const validateEmail = validate(emailRules)

const isFormValid = (model: Model): boolean =>
  allValid([
    [model.name, nameRules],
    [model.email, emailRules],
  ])

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedName: ({ value }) => ({
      model: evo(model, {
        name: () => validateName(value),
      }),
    }),

    UpdatedEmail: ({ value }) => {
      const validateEmailResult = validateEmail(value)

      if (validateEmailResult._tag === 'Valid') {
        return {
          model: evo(model, {
            email: () => Validating({ value }),
          }),
          commands: [ValidateEmail({ email: value })],
        }
      } else {
        return {
          model: evo(model, {
            email: () => validateEmailResult,
          }),
        }
      }
    },

    CompletedValidateEmail: ({ field }) => {
      if (field.value === model.email.value) {
        return {
          model: evo(model, {
            email: () => field,
          }),
        }
      } else {
        return { model }
      }
    },

    UpdatedMessageText: ({ value }) => ({
      model: evo(model, {
        messageText: () => Valid({ value }),
      }),
    }),

    ClickedFormSubmit: () => {
      if (model.submission._tag === 'Submitting') {
        return { model }
      }

      if (!isFormValid(model)) {
        return { model }
      }

      return {
        model: evo(model, {
          submission: () => Submitting(),
        }),
        commands: [
          SubmitForm({
            name: model.name.value,
            email: model.email.value,
            messageText: model.messageText.value,
          }),
        ],
      }
    },

    SucceededSubmitForm: ({ name }) => ({
      model: evo(model, {
        submission: () =>
          SubmitSuccess({
            confirmationText: `Welcome to the waitlist, ${name}! We'll be in touch soon.`,
          }),
      }),
    }),

    FailedSubmitForm: () => ({
      model: evo(model, {
        submission: () =>
          SubmitError({
            error:
              'Sorry, there was an error adding you to the waitlist. Please try again.',
          }),
      }),
    }),
  })

// COMMAND

const FAKE_API_DELAY_MS = 500

export const SubmitForm = Command.define('SubmitForm', {
  args: { name: S.String, email: S.String, messageText: S.String },
  messages: [Message.SucceededSubmitForm, Message.FailedSubmitForm],
  execute: ({ name }) =>
    Effect.gen(function* () {
      yield* Effect.sleep(`${FAKE_API_DELAY_MS} millis`)

      const isSuccess = yield* Random.nextBoolean
      if (isSuccess) {
        return Message.SucceededSubmitForm({ name })
      } else {
        return Message.FailedSubmitForm()
      }
    }),
})

// VIEW

const LABEL_CLASS = 'text-sm font-medium text-gray-700'
const DESCRIPTION_CLASS = 'text-sm mt-1'

const borderClass = (field: Field<string>): string =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    }),
  )

const inputClassName = (field: Field<string>): string =>
  clsx(
    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    borderClass(field),
  )

const statusIndicator = (field: Field<string>, h: HtmlBuilder<Message>): Html =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => h.empty,
      Validating: () =>
        h.span([h.Class('text-blue-600 text-sm animate-spin')], ['◐']),
      Valid: () => h.span([h.Class('text-green-600 text-sm')], ['✓']),
      Invalid: () => h.empty,
    }),
  )

const descriptionView = (
  field: Field<string>,
  descriptionAttributes: ReadonlyArray<Attribute<Message>>,
  h: HtmlBuilder<Message>,
): Html =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => h.empty,
      Validating: () =>
        h.span(
          [
            ...descriptionAttributes,
            h.Class(clsx(DESCRIPTION_CLASS, 'text-blue-600')),
          ],
          ['Checking...'],
        ),
      Valid: () => h.empty,
      Invalid: ({ errors }) =>
        h.span(
          [
            ...descriptionAttributes,
            h.Class(clsx(DESCRIPTION_CLASS, 'text-red-600')),
          ],
          [Array.headNonEmpty(errors)],
        ),
    }),
  )

const inputFieldView = (
  id: string,
  labelText: string,
  field: Field<string>,
  onUpdate: (value: string) => Message,
  type: string,
  h: HtmlBuilder<Message>,
): Html =>
  Input.view(
    {
      id,
      value: field.value,
      onInput: onUpdate,
      isInvalid: field._tag === 'Invalid',
      type,
      toView: attributes =>
        h.div(
          [h.Class('mb-4')],
          [
            h.div(
              [h.Class('flex items-center gap-2 mb-2')],
              [
                h.label(
                  [...attributes.label, h.Class(LABEL_CLASS)],
                  [labelText],
                ),
                statusIndicator(field, h),
              ],
            ),
            h.input([...attributes.input, h.Class(inputClassName(field))]),
            descriptionView(field, attributes.description, h),
          ],
        ),
    },
    h,
  )

const textareaFieldView = (
  id: string,
  labelText: string,
  field: Field<string>,
  onUpdate: (value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  Textarea.view(
    {
      id,
      value: field.value,
      onInput: onUpdate,
      isInvalid: field._tag === 'Invalid',
      toView: attributes =>
        h.div(
          [h.Class('mb-4')],
          [
            h.div(
              [h.Class('flex items-center gap-2 mb-2')],
              [
                h.label(
                  [...attributes.label, h.Class(LABEL_CLASS)],
                  [labelText],
                ),
                statusIndicator(field, h),
              ],
            ),
            h.textarea([
              ...attributes.textarea,
              h.Class(inputClassName(field)),
            ]),
            descriptionView(field, attributes.description, h),
          ],
        ),
    },
    h,
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const canSubmit = isFormValid(model) && model.submission._tag !== 'Submitting'

  const body = h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h.h1(
            [h.Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Join Our Waitlist'],
          ),

          h.form(
            [h.Class('space-y-4'), h.OnSubmit(Message.ClickedFormSubmit())],
            [
              inputFieldView(
                'name',
                'Name',
                model.name,
                value => Message.UpdatedName({ value }),
                'text',
                h,
              ),
              inputFieldView(
                'email',
                'Email',
                model.email,
                value => Message.UpdatedEmail({ value }),
                'email',
                h,
              ),
              textareaFieldView(
                'message',
                "Anything you'd like to share with us?",
                model.messageText,
                value => Message.UpdatedMessageText({ value }),
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
                },
                h,
              ),
            ],
          ),

          M.value(model.submission).pipe(
            M.tagsExhaustive({
              NotSubmitted: () => h.empty,
              Submitting: () => h.empty,
              SubmitSuccess: ({ confirmationText }) =>
                h.div(
                  [
                    h.Role('status'),
                    h.Class(
                      'mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg',
                    ),
                  ],
                  [confirmationText],
                ),
              SubmitError: ({ error }) =>
                h.div(
                  [
                    h.Role('alert'),
                    h.Class(
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

  return { title: 'Foldkit Form Example', body }
}
