import { Match as M, Schema as S } from 'effect'
import { makeField, minLength, required } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const StringField = makeField(S.String)

const validatePassword = StringField.validate([
  required('Password is required'),
  minLength(8, 'Must be at least 8 characters'),
])

const validateConfirmPassword = (password: string, confirmPassword: string) =>
  M.value(validatePassword(confirmPassword)).pipe(
    M.tag('Valid', () =>
      confirmPassword === password
        ? StringField.Valid({ value: confirmPassword })
        : StringField.Invalid({
            value: confirmPassword,
            errors: ['Passwords must match'],
          }),
    ),
    M.orElse(invalidResult => invalidResult),
  )

const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedPassword: ({ value }) => [
        evo(model, {
          password: () => validatePassword(value),
          confirmPassword: confirmPassword =>
            M.value(confirmPassword).pipe(
              M.tag('NotValidated', () => confirmPassword),
              M.orElse(() =>
                validateConfirmPassword(value, confirmPassword.value),
              ),
            ),
        }),
        [],
      ],

      ChangedConfirmPassword: ({ value }) => [
        evo(model, {
          confirmPassword: () =>
            validateConfirmPassword(model.password.value, value),
        }),
        [],
      ],
    }),
  )
