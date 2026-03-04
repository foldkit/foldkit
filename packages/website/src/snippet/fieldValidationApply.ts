import { Match as M, Schema as S } from 'effect'
import { makeField } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const StringField = makeField(S.String)

const validateUsername = StringField.validate(usernameValidations)
const validateUsernameAll = StringField.validateAll(
  usernameValidations,
)

const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedUsername: ({ value }) => [
        evo(model, {
          username: () => validateUsername(value),
        }),
        [],
      ],
    }),
  )
