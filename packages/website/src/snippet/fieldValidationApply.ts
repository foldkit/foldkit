import { Update } from 'foldkit'
import { validate } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const validateUsername = validate(usernameRules)

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedUsername: ({ value }) => ({
      model: evo(model, {
        username: () => validateUsername(value),
      }),
    }),
  })
