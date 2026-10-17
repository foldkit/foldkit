import { Runtime } from 'foldkit'

import { ApplicationComposition, init, update, view } from './application'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    position: 'BottomLeft',
  },
})

Runtime.run(application)
