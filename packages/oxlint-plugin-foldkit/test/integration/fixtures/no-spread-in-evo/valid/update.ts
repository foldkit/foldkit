import { evo } from 'foldkit/struct'
import { Model } from './model'

// UPDATE

export const update = (model: Model): Model =>
  evo(model, {
    user: (user) => evo(user, { name: () => 'Ada' }),
  })

export const updateLocal = (
  model: Model,
  evo: (model: Model, updates: unknown) => Model,
): Model => evo(model, { user: () => ({ ...model.user, name: 'Ada' }) })
