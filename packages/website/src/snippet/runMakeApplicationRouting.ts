import { Runtime } from 'foldkit'

import { ChangedUrl, Model, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(application)
