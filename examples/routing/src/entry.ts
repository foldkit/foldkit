import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import {
  ChangedUrl,
  ClickedLink,
  Message,
  Model,
  init,
  subscriptions,
  update,
  view,
} from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
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
