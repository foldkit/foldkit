import { Runtime } from 'foldkit'

import { Flags, flags, init } from './main'
import { ChangedUrl, ClickedLink, Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const program = Runtime.makeProgram({
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
    Message,
  },
})

Runtime.run(program)
