import { Effect, Layer } from 'effect'

import { EducationEntry as Entry } from './blocks'
import { EffectsLayer } from './command'
import { EntriesBinding } from './composition'
import { EducationBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = EducationBlock.makeLayer(
  Effect.gen(function* () {
    const entries = yield* EntriesBinding

    return {
      children: [entries],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Entry.layer)))

export { EducationBlock } from './definition'
