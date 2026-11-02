import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'
import './styles.css'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.hydrate(program)
