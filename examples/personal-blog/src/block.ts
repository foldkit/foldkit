import { Effect, Layer } from 'effect'

import { EffectsLayer } from './command'
import { CounterBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import * as Counter from './island'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const counter = yield* CounterBinding
    return { children: [counter], init, update, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(Counter.layer))
