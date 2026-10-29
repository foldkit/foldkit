import { modifyFields } from 'foldkit/struct'

// ❌ Bad
// Spreading a nested field inside modifyFields defeats the point of modifyFields.
const badUpdate = (model: Model) =>
  modifyFields(model, {
    user: () => ({ ...model.user, name: 'Ada' }),
  })

// ✅ Good
// Evolve the nested field with a nested modifyFields.
const goodUpdate = (model: Model) =>
  modifyFields(model, {
    user: user => modifyFields(user, { name: () => 'Ada' }),
  })
