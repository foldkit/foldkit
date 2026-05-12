import { Runtime } from 'foldkit'

import {
  ChangedUrl,
  ClickedLink,
  Flags,
  Message,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
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
    Message,
  },
})

Runtime.run(program)
