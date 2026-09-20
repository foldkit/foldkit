import { Update } from 'foldkit'
import { validate } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

const validateUsername = validate(usernameRules)

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedUsername: ({ value }) => ({
      model: modifyFields(model, {
        username: () => validateUsername(value),
      }),
    }),
  })
