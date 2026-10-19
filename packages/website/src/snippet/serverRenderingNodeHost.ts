import { Config, Option, String } from 'effect'

import { NodeRuntime } from '@effect/platform-node'
import * as Node from '@foldkit/node'

const port = Config.withDefault(Config.Port('PORT'), 3000)
const origin = Config.option(Config.String('ORIGIN')).pipe(
  Config.map(Option.filter(String.isNonEmpty)),
)

NodeRuntime.runMain(Node.serve({ port, origin }))
