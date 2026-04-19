import { Match as M } from 'effect'
import { validate } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const validateUsername = validate(usernameRules)

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
