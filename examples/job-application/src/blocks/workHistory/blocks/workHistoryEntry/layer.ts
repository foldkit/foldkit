import { Layer } from 'effect'

import { DatePicker } from '@foldkit/ui'

import { WorkHistoryEntryBlock } from './block'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = WorkHistoryEntryBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(DatePicker.layer)))
