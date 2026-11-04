import { Effect, Layer } from 'effect'

import { Login } from './blocks'
import { LoginModelBinding } from './composition'
import { LoggedOutBlock } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = LoggedOutBlock.makeLayer(
  Effect.gen(function* () {
    const login = yield* LoginModelBinding

    return {
      children: [login],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Login.layer))

export { LoggedOutBlock } from './definition'
