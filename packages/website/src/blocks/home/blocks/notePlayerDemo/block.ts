import { Effect, Layer } from 'effect'

import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'

import { NoteDurationRadioGroupBinding } from './composition'
import { NotePlayerDemoBlock } from './definition'
import {
  EffectsLayer,
  init,
  managedResources,
  update,
  view,
} from './notePlayerDemo'

export const layer = NotePlayerDemoBlock.makeLayer(
  Effect.gen(function* () {
    const noteDurationRadioGroup = yield* NoteDurationRadioGroupBinding

    return {
      children: [noteDurationRadioGroup],
      init,
      update,
      view,
      managedResources,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(RadioGroupLayer)))

export { NotePlayerDemoBlock }
