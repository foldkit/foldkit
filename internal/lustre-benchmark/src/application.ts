import { Block } from 'foldkit'

import {
  Model,
  Message,
  init as init_,
  updateHandlers,
  view as view_,
} from './todo'

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()
export const init = ApplicationComposition.makeInit(init_)
export const update = ApplicationComposition.makeUpdate(updateHandlers)
export const view = ApplicationComposition.makeView(view_)

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
