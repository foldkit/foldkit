import { modifyFields } from 'foldkit/struct'
import { Model } from './model'

// UPDATE

export const update = (model: Model): Model =>
  modifyFields(model, {
    user: (user) => modifyFields(user, { name: () => 'Ada' }),
  })

export const updateLocal = (
  model: Model,
  modifyFields: (model: Model, updates: unknown) => Model,
): Model => modifyFields(model, { user: () => ({ ...model.user, name: 'Ada' }) })
