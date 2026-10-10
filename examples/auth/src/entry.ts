import { Application, Runtime } from 'foldkit'

import { AppLayer } from './layer'
import { Flags, flags, init } from './main'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const application = Application.make({
  Model,
  Flags,
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

Runtime.run(Application.provide(application, AppLayer), { flags })
