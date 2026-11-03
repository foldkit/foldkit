import { Effect } from 'effect'

import { ReadValue } from './command.js'
import { GraphBuildError, GraphSettings, HostDefinition } from './contracts.js'
import { init } from './init.js'
import { update } from './update.js'
import { view } from './view.js'

export const PendingHostBlock = HostDefinition.makeBlock(
  Effect.gen(function* () {
    const settings = yield* GraphSettings

    if (settings.isUnavailable) {
      return yield* Effect.fail(new GraphBuildError())
    }

    return {
      children: [],
      init,
      update,
      view,
      hostHandlers: [ReadValue],
    }
  }),
)
