import { Effect, Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { NotePlayerDemoBlock } from './block'
import { DelayAdvanceNotePlayerPhase, PlayNote } from './command'
import { NoteDurationRadioGroupBinding } from './composition'
import { init } from './init'
import { managedResources } from './resource'
import { update } from './update'
import { view } from './view'

export const layer = NotePlayerDemoBlock.makeLayer(
  Effect.gen(function* () {
    const noteDurationRadioGroup = yield* NoteDurationRadioGroupBinding

    return {
      children: [noteDurationRadioGroup],
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
