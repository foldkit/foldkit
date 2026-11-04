import { Effect, Layer } from 'effect'

import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'

import { EffectsLayer } from './command'
import { EditionRadioGroupBinding } from './composition'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const editionRadioGroup = yield* EditionRadioGroupBinding

    return {
      children: [editionRadioGroup],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(RadioGroupLayer)))

export { ApplicationBlock } from './definition'
