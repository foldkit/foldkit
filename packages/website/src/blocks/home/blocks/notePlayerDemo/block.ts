import { Effect, Layer } from 'effect'

import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'

import { NoteDurationRadioGroupBinding } from './composition'
import { NotePlayerDemoDefinition } from './definition'
import {
  EffectsLayer,
  init,
  managedResources,
  update,
  view,
} from './notePlayerDemo'

export const NotePlayerDemoBlock = NotePlayerDemoDefinition.contract

const block = NotePlayerDemoDefinition.makeBlock(
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
).provide(Layer.mergeAll(RadioGroupLayer))
export const layer = block.layer
