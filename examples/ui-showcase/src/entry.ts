import { Application, Runtime } from 'foldkit'

import {
  Flags,
  Message,
  Model,
  flags,
  init,
  layer,
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
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, layer), { flags })
