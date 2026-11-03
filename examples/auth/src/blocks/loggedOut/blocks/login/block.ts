import { Effect } from 'effect'

import { LoginDefinition } from './definition'
import { EffectsLayer, init, update } from './login'
import { view } from './view'

export const LoginBlock = LoginDefinition.contract

export const layer = LoginDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).layer
