import { Effect } from 'effect'

import { Login } from './blocks'
import { LoginBinding } from './composition'
import { LoggedOutDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const LoggedOutBlock = LoggedOutDefinition.contract

export const layer = LoggedOutDefinition.makeBlock(
  Effect.gen(function* () {
    const login = yield* LoginBinding

    return {
      children: [login],
      init,
      update,
      view,
    }
  }),
).provide(Login.layer).layer
