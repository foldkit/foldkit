import { Update } from 'foldkit'
import { validate } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const validateUsername = validate(usernameRules)

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedUsername: ({ value }) => ({
      model: evo(model, {
        username: () => validateUsername(value),
      }),
    }),
  })
