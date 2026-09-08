import { Effect, Match, Number, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import { Invalid, Valid, Validating, validate } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const validateEmail = validate(emailRules)

const CheckEmailAvailable = Command.define('CheckEmailAvailable', {
  args: { email: Schema.String, validationId: Schema.Number },
  messages: [CompletedCheckEmailAvailable],
  execute: ({ email, validationId }) =>
    Effect.gen(function* () {
      const isAvailable = yield* apiCheckEmail(email)
      return CompletedCheckEmailAvailable({
        validationId,
        field: isAvailable
          ? Valid({ value: email })
          : Invalid({
              value: email,
              errors: ['This email is already taken'],
            }),
      })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(
          CompletedCheckEmailAvailable({
            validationId,
            field: Invalid({
              value: email,
              errors: ['Could not check this email. Try again.'],
            }),
          }),
        ),
      ),
    ),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedEmail: ({ value }) => {
      const syncResult = validateEmail(value)
      const validationId = Number.increment(model.emailValidationId)

      return Match.value(syncResult).pipe(
        Match.tag('Valid', () => ({
          model: evo(model, {
            email: () => Validating({ value }),
            emailValidationId: () => validationId,
          }),
          commands: [CheckEmailAvailable({ email: value, validationId })],
        })),
        Match.orElse(() => ({
          model: evo(model, {
            email: () => syncResult,
            emailValidationId: () => validationId,
          }),
        })),
      )
    },

    CompletedCheckEmailAvailable: ({ validationId, field }) => {
      if (validationId === model.emailValidationId) {
        return { model: evo(model, { email: () => field }) }
      } else {
        return { model }
      }
    },
  })
