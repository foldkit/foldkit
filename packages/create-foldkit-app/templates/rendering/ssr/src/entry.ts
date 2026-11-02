import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, Flags } from './application'
import './styles.css'

const program = Program.make(Application, {
  layer: ApplicationLive,
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.hydrate(program)
