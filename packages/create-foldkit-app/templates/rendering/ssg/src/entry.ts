import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'
import './styles.css'

const program = Program.make(Application, {
  layer: ApplicationLive,
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.hydrate(program)
