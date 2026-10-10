import { Application, Runtime } from 'foldkit'

import {
  EffectsLayer,
  Flags,
  Message,
  Model,
  flags,
  init,
  mounts,
  subscriptions,
  update,
  view,
} from './main'

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
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

Runtime.run(Application.provide(application, EffectsLayer), { flags })
