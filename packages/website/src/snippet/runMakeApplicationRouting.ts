import { Application, Runtime } from 'foldkit'

import { Model, init, update, view } from './main'
import { Message } from './message'

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
})

Runtime.run(application)
