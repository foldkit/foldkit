import { overlay } from '@foldkit/devtools'
import { Runtime } from 'foldkit'

import { Flags, flags, init } from './main'
import { ChangedUrl, ClickedLink, Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)
