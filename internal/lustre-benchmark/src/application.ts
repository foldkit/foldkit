import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import {
  Model,
  Message,
  init as init_,
  updateHandlers,
  view as view_,
} from './todo'

export const ApplicationKey = Symbol('LustreBenchmark/Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
export const ApplicationComposition = ApplicationBlock.makeComposition()
export const init = ApplicationComposition.makeInit(init_)
export const update = ApplicationComposition.makeUpdate(updateHandlers)
export const view = ApplicationComposition.makeView(view_)

export const layer = ApplicationBlock.makeLayer(
  Effect.succeed({
    children: [],
    init,
    update,
    view,
  }),
)
