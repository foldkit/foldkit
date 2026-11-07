import { Layer } from 'effect'

import { WorkHistoryBlock } from './block'
import { WorkHistoryEntry as Entry } from './blocks'
import { GenerateWorkHistoryEntryId } from './command'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = WorkHistoryBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: GenerateWorkHistoryEntryId.layer,
}).pipe(Layer.provide(Layer.mergeAll(Entry.layer)))
