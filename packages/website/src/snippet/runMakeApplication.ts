import { Runtime } from 'foldkit'

import { ChangedUrl, ClickedLink, Model, init, update, view } from './main'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(program)
