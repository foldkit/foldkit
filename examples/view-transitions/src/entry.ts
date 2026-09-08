import { Runtime } from 'foldkit'

import { Message, Model, init, update, view, viewTransition } from './main'

const application = Runtime.makeApplication({
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

Runtime.run(application)
