import { Effect } from 'effect'

import { LoggedInDefinition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const LoggedInBlock = LoggedInDefinition.contract

export const layer = LoggedInDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, view }
  }),
).layer
