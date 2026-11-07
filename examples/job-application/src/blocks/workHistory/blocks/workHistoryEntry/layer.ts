import { Effect, Layer } from 'effect'

import { DatePicker } from '@foldkit/ui'

import { WorkHistoryEntryBlock } from './block'
import { WorkHistoryEntryComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = WorkHistoryEntryBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* WorkHistoryEntryComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(DatePicker.layer)))
