import { Effect, Layer } from 'effect'

import { Counter } from './blocks'
import { EffectsLayer } from './command'
import { CounterBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const counter = yield* CounterBinding
    return { children: [counter], init, update, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(Counter.layer))
