import { overlay } from '@foldkit/devtools'
import { Runtime } from 'foldkit'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    maxEntries: 250,
  },
})

Runtime.run(application)
