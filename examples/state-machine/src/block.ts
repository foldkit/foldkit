import { Effect, Layer } from 'effect'

import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'

import { EffectsLayer } from './command'
import { EditionRadioGroupBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
).provide(Layer.mergeAll(RadioGroupLayer))
