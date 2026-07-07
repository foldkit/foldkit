import * as Struct from 'foldkit/struct'
import { Model } from './model'

// UPDATE

export const update = (model: Model): Model =>
  Struct.evo(model, {
    user: () => ({ ...model.user, name: 'Ada' }),
  })
