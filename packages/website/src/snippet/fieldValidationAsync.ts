import { Effect, Match as M, Number, Schema as S } from 'effect'
import { Command } from 'foldkit/command'
import { makeField } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const StringField = makeField(S.String)

const validateEmail = StringField.validate(emailValidations)

const checkEmailAvailable = (
  email: string,
  validationId: number,
): Command<typeof ValidatedEmail> =>
  Effect.gen(function* () {
    const isAvailable = yield* apiCheckEmail(email)
    return ValidatedEmail({
      validationId,
      field: isAvailable
        ? StringField.Valid({ value: email })
        : StringField.Invalid({
            value: email,
            errors: ['This email is already taken'],
          }),
    })
  })

const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedEmail: ({ value }) => {
        const syncResult = validateEmail(value)
        const validationId = Number.increment(model.emailValidationId)

        return M.value(syncResult).pipe(
          M.tag('Valid', () => [
            evo(model, {
              email: () => StringField.Validating({ value }),
              emailValidationId: () => validationId,
            }),
            [checkEmailAvailable(value, validationId)],
          ]),
          M.orElse(() => [
            evo(model, { email: () => syncResult }),
            [],
          ]),
        )
      },

      ValidatedEmail: ({ validationId, field }) => {
        if (validationId !== model.emailValidationId) {
          return [model, []]
        }
        return [evo(model, { email: () => field }), []]
      },
    }),
  )
