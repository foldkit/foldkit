import { Effect, Layer } from 'effect'

import { ApplicationBlock } from './block'
import { Counter } from './blocks'
import { CounterBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const counter = yield* CounterBinding

    return {
      children: [counter],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Counter.layer)))
