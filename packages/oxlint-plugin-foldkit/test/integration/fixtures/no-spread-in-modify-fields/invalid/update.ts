import { modifyFields as updateModel } from 'foldkit/struct'
import { Model } from './model'

// UPDATE

export const update = (model: Model): Model =>
  updateModel(model, {
    user: () => ({ ...model.user, name: 'Ada' }),
  })
