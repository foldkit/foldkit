import { Effect, Match, Number, Schema } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { Block, Command } from 'foldkit'
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  Valid,
  Validating,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

const validateEmail = validate(emailRules)

const EmailAvailability = Schema.Struct({ isAvailable: Schema.Boolean })

const Model = Schema.Struct({
  email: Field(Schema.String),
  emailValidationId: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedEmail: { value: Schema.String },
  CompletedCheckEmailAvailable: {
    validationId: Schema.Number,
    field: Field(Schema.String),
  },
})
type Message = typeof Message.Type

const CheckEmailAvailable = Command.define('CheckEmailAvailable', {
  args: { email: Schema.String, validationId: Schema.Number },
  messages: [Message.CompletedCheckEmailAvailable],
})

class SignupForm extends Block<SignupForm>()('SignupForm', {
  Model,
  Message,
  Command: [CheckEmailAvailable],
}) {}

const SignupFormLive = SignupForm.make(
  Effect.fn(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      model: { email: NotValidated({ value: '' }), emailValidationId: 0 },

      update: {
        ChangedEmail: (model, { value }) => {
          const syncResult = validateEmail(value)
          const validationId = Number.increment(model.emailValidationId)

          return Match.value(syncResult).pipe(
            Match.tag('Valid', () => ({
              model: modifyFields(model, {
                email: () => Validating({ value }),
                emailValidationId: () => validationId,
              }),
              commands: [CheckEmailAvailable({ email: value, validationId })],
            })),
            Match.orElse(() => ({
              model: modifyFields(model, {
                email: () => syncResult,
                emailValidationId: () => validationId,
              }),
            })),
          )
        },

        CompletedCheckEmailAvailable: (model, { validationId, field }) => {
          if (validationId === model.emailValidationId) {
            return { model: modifyFields(model, { email: () => field }) }
          } else {
            return { model }
          }
        },
      },

      commands: {
        CheckEmailAvailable: ({ email, validationId }) =>
          client.get('/api/email-availability', { urlParams: { email } }).pipe(
            Effect.flatMap(
              HttpClientResponse.schemaBodyJson(EmailAvailability),
            ),
            Effect.map(({ isAvailable }) =>
              Message.CompletedCheckEmailAvailable({
                validationId,
                field: isAvailable
                  ? Valid({ value: email })
                  : Invalid({
                      value: email,
                      errors: ['This email is already taken'],
                    }),
              }),
            ),
            Effect.catch(() =>
              Effect.succeed(
                Message.CompletedCheckEmailAvailable({
                  validationId,
                  field: Invalid({
                    value: email,
                    errors: ['Could not check this email. Try again.'],
                  }),
                }),
              ),
            ),
          ),
      },

      view: (model, h) =>
        h.input([
          h.Value(model.email.value),
          h.OnInput(value => Message.ChangedEmail({ value })),
        ]),
    }
  }),
)
