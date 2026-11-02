import { Effect } from 'effect'

import { ApplicationDefinition, init, update, view } from './counterFlagsRoot'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, view }
  }),
)
