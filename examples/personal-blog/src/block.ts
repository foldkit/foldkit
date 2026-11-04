import { Effect, Layer } from 'effect'

import { Counter } from './blocks'
import { EffectsLayer } from './command'
import { CounterBinding } from './composition'
import { ApplicationBlock } from './definition'
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

export { ApplicationBlock } from './definition'
