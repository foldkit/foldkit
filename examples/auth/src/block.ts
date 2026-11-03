import { Effect, Layer } from 'effect'

import { LoggedIn, LoggedOut } from './blocks'
import { EffectsLayer } from './command'
import { LoggedInBinding } from './composition/loggedIn'
import { LoggedOutBinding } from './composition/loggedOut'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const loggedOut = yield* LoggedOutBinding
    const loggedIn = yield* LoggedInBinding
    return { children: [loggedOut, loggedIn], init, update, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(LoggedIn.layer, LoggedOut.layer))
