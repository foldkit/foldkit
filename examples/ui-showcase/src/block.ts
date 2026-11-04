import { Effect, Layer } from 'effect'

import { Ui } from './blocks'
import { EffectsLayer } from './command'
import { UiModelBinding } from './composition'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const ui = yield* UiModelBinding

    return {
      children: [ui],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Ui.layer))

export { ApplicationBlock } from './definition'
