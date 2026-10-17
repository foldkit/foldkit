import { Array, Duration, Effect, Layer, Random, Schema } from 'effect'
import { Invalid, Valid } from 'foldkit/fieldValidation'

import { Application } from './definition'
import { Message } from './message'

const FAKE_API_DELAY_MS = 500

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

export const ValidateEmail = Application.command('ValidateEmail', {
  args: { email: Schema.String },
  messages: [Message.CompletedValidateEmail],
  handler: function* () {
    return ({ email }) =>
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
      })
  },
})

export const SubmitForm = Application.command('SubmitForm', {
  args: {
    name: Schema.String,
    email: Schema.String,
    messageText: Schema.String,
  },
  messages: [Message.SucceededSubmitForm, Message.FailedSubmitForm],
  handler: function* () {
    return ({ name }) =>
      Effect.gen(function* () {
        yield* Effect.sleep(`${FAKE_API_DELAY_MS} millis`)

        const isSuccess = yield* Random.nextBoolean
        if (isSuccess) {
          return Message.SucceededSubmitForm({ name })
        } else {
          return Message.FailedSubmitForm()
        }
      })
  },
})

export const EffectsLayer = Layer.mergeAll(
  ValidateEmail.layer,
  SubmitForm.layer,
)
