import { Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { NotePlayerDemoBlock } from './block'
import { DelayAdvanceNotePlayerPhase, PlayNote } from './command'
import { init } from './init'
import { managedResources } from './resource'
import { update } from './update'
import { view } from './view'

export const layer = NotePlayerDemoBlock.makeLayer({
  init,
  update,
  view,
  managedResources,
  EffectsLayer: Layer.mergeAll(
    DelayAdvanceNotePlayerPhase.layer,
    PlayNote.layer,
    managedResources.layer,
  ),
}).pipe(Layer.provide(Layer.mergeAll(RadioGroup.layer)))
