import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { DragAndDrop } from '@foldkit/ui'

import { Application, ApplicationLive, Flags, flags } from './application'
import { NewCardFormLive } from './newCardForm'
import { ApplicationLayer } from './services'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(NewCardFormLive),
    Layer.provide(DragAndDrop.DragAndDropLive),
    Layer.provide(ApplicationLayer),
  ),
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })
