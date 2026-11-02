import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'
import { ChatSocketLive, ChatSocketsLive } from './chatSocket'
import { ApplicationLayer } from './services'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(ChatSocketLive),
    Layer.provide(ChatSocketsLive),
    Layer.provide(ApplicationLayer),
  ),
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)
