import { Layer } from 'effect'

import { DragAndDrop } from '@foldkit/ui'

import { IssueBoardBlock } from './block'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = IssueBoardBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(DragAndDrop.layer))
