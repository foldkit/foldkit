import { Array, Duration, Effect, Schema } from 'effect'
import { Invalid, Valid } from 'foldkit/fieldValidation'

import { Message, PersonalInfoDefinition } from './definition'

const FAKE_API_DELAY_MS = 600

const TAKEN_EMAILS = [
  'admin@foldkit.dev',
  'test@example.com',
  'demo@foldkit.dev',
]

const isEmailTaken = (emailInput: string): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(FAKE_API_DELAY_MS))
    return Array.contains(TAKEN_EMAILS, emailInput.toLowerCase())
  })

export const ValidateEmailAsync = PersonalInfoDefinition.makeCommand(
  'ValidateEmailAsync',
  {
    args: { emailInput: Schema.String, validationId: Schema.Number },
    messages: [Message.CompletedValidateEmailAsync],
    handler: function* () {
      return ({ emailInput, validationId }) =>
        Effect.gen(function* () {
          if (yield* isEmailTaken(emailInput)) {
            return Message.CompletedValidateEmailAsync({
              validationId,
              field: Invalid({
                value: emailInput,
                errors: ['This email is already in use'],
              }),
            })
          }
          return Message.CompletedValidateEmailAsync({
            validationId,
            field: Valid({ value: emailInput }),
          })
        })
    },
  },
)

export const EffectsLayer = ValidateEmailAsync.layer
