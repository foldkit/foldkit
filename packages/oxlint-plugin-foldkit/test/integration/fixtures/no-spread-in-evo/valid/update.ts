import { evo } from 'foldkit/struct'
import { Model } from './model'

// UPDATE

export const update = (model: Model): Model =>
  evo(model, {
    user: (user) => evo(user, { name: () => 'Ada' }),
  })
