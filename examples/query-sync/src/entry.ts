import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import {
  EffectsLayer,
  Message,
  Model,
  init,
  mounts,
  update,
  view,
} from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  mounts,
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
