import { Effect } from 'effect'

import { ChildDefinition } from './definition.js'
import { init } from './init.js'
import { update } from './update.js'
import { view } from './view.js'

export const ChildBlock = ChildDefinition.makeBlock(
  Effect.succeed({ children: [], init, update, view }),
)
