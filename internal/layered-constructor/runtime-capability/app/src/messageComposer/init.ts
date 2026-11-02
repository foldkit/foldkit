import { MessageComposerComposition } from './composition'
import { Model } from './model'

export const init = MessageComposerComposition.makeInit(id => ({
  model: Model.make({ id, text: '' }),
}))
