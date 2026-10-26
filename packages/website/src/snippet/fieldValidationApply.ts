import { validate } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

const validateUsername = validate(usernameRules)

const update = ApplicationComposition.makeUpdate({
  ChangedUsername: (model, { value }) => ({
    model: modifyFields(model, {
      username: () => validateUsername(value),
    }),
  }),
})
