import { Application, Runtime } from 'foldkit'

import {
  Message,
  Model,
  init,
  layer,
  update,
  view,
  viewTransition,
} from './main'

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
  viewTransition,
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, layer))
