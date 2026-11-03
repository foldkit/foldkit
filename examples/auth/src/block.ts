import { Effect, Layer } from 'effect'

import { LoggedIn, LoggedOut } from './blocks'
import { EffectsLayer } from './command'
import { LoggedInBindingWithOutMessagePolicy } from './composition/loggedIn'
import { LoggedOutBindingWithOutMessagePolicy } from './composition/loggedOut'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const loggedOut = yield* LoggedOutBindingWithOutMessagePolicy
    const loggedIn = yield* LoggedInBindingWithOutMessagePolicy
    return { children: [loggedOut, loggedIn], init, update, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(LoggedIn.layer, LoggedOut.layer))
