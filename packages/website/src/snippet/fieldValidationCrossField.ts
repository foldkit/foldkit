import { Match as M } from 'effect'
import {
  type Field,
  Invalid,
  Valid,
  makeRules,
  minLength,
  validate,
} from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const passwordRules = makeRules({
  required: 'Password is required',
  rules: [minLength(8, 'Must be at least 8 characters')],
})

const validatePassword = validate(passwordRules)

const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
): Field =>
  M.value(validatePassword(confirmPassword)).pipe(
    M.tag('Valid', () =>
      confirmPassword === password
        ? Valid({ value: confirmPassword })
        : Invalid({
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
