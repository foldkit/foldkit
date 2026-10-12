import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { EffectsLayer, Message, Model, init, update, view } from './main'
import './styles.css'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

pipe(application, Application.provide(EffectsLayer), Runtime.hydrate)
