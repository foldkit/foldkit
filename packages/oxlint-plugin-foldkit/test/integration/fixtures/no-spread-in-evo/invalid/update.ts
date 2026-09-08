import { evo as evolve } from 'foldkit/struct'
import { Model } from './model'

// UPDATE

export const update = (model: Model): Model =>
  evolve(model, {
    user: () => ({ ...model.user, name: 'Ada' }),
  })
