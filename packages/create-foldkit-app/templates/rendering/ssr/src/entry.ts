import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { Flags, Message, Model, EffectsLayer, init, update, view } from './main'
import './styles.css'

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

pipe(application, Application.provide(EffectsLayer), Runtime.hydrate)
