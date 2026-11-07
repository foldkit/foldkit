import { Effect, Layer } from 'effect'

import { LoggedOutBlock } from './block'
import { Login } from './blocks'
import { LoggedOutComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = LoggedOutBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* LoggedOutComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Login.layer))
