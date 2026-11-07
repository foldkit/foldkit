import { Effect, Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { NotePlayerDemoBlock } from './block'
import { DelayAdvanceNotePlayerPhase, PlayNote } from './command'
import { NotePlayerDemoComposition } from './composition'
import { init } from './init'
import { managedResources } from './resource'
import { update } from './update'
import { view } from './view'

export const layer = NotePlayerDemoBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* NotePlayerDemoComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
      managedResources,
      EffectsLayer: Layer.mergeAll(
        DelayAdvanceNotePlayerPhase.layer,
        PlayNote.layer,
        managedResources.layer,
      ),
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(RadioGroup.layer)))
