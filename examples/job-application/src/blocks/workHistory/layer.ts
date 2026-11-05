import { Effect, Layer } from 'effect'

import { WorkHistoryBlock } from './block'
import { WorkHistoryEntry as Entry } from './blocks'
import { GenerateWorkHistoryEntryId } from './command'
import { EntriesBinding } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = WorkHistoryBlock.makeLayer(
  Effect.gen(function* () {
    const entries = yield* EntriesBinding

    return {
      children: [entries],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: GenerateWorkHistoryEntryId.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Entry.layer)))
