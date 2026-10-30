import { Program, Runtime } from 'foldkit'

import {
  Application,
  ApplicationLive,
  Flags,
} from './serverRenderingApplication'

const program = Program.make(Application, {
  layer: ApplicationLive,
  Flags,
  container: document.getElementById('root'),
})

Runtime.hydrate(program)
