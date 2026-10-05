import { Config, Option, String } from 'effect'

import { NodeRuntime } from '@effect/platform-node'
import * as Node from '@foldkit/node'

const DEFAULT_PORT = 3000

const PORT = Config.withDefault(Config.Port('PORT'), DEFAULT_PORT)

const ORIGIN = Config.option(Config.String('ORIGIN')).pipe(
  Config.map(Option.filter(String.isNonEmpty)),
)

NodeRuntime.runMain(Node.serve({ port: PORT, origin: ORIGIN }))
