import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import {
  EffectsLayer,
  Message,
  Model,
  init,
  subscriptions,
  update,
  view,
} from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

pipe(application, Application.provide(EffectsLayer), Runtime.run)
