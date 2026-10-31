import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'
import { ControlsLive } from './controls'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ControlsLive)),
  container: document.getElementById('root'),
  devTools: {
    dispatch: true,
    excludeFromHistory: [
      'TickedFrame',
      'MovedPointer',
      'CompletedGenerateAmbientParticle',
    ],
  },
})

Runtime.run(program)
