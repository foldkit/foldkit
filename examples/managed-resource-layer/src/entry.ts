import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import { Message, Model, init, managedResources, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  managedResources,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)
