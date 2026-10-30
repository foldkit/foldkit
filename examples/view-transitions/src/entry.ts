import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, viewTransition } from './application'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  viewTransition,
  devTools: { dispatch: true },
})

Runtime.run(program)
