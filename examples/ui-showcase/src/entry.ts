import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, Flags, flags } from './application'

const program = Program.make(Application, {
  layer: ApplicationLive,
  Flags,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program, { flags })
