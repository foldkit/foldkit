import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'

import {
  Application,
  ApplicationLive,
  Flags,
  readCountCookie,
} from './serverRenderingApplication'

const program = Program.make(Application, {
  layer: ApplicationLive,
  Flags,
  container: document.getElementById('root'),
})

const flags = Effect.sync(() =>
  Flags.make({ initialCount: readCountCookie(document.cookie) }),
)

Runtime.run(program, { flags })
