import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'

import { ApplicationLayer } from './counterServices'
import { Flags, flags } from './flagsDefinition'
import { Application, ApplicationLive } from './initWithFlags'

const program = Program.make(Application, {
  layer: ApplicationLive,
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })
