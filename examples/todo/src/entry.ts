import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, Flags, flags } from './application'
import { ApplicationLayer } from './services'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program, {
  flags: flags.pipe(Effect.provide(ApplicationLayer)),
})
