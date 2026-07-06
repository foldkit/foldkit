import { evo } from 'foldkit/struct'
import { Model } from './model'

// UPDATE

export const update = (model: Model): Model =>
  evo(model, {
    user: () => ({ ...model.user, name: 'Ada' }),
  })
