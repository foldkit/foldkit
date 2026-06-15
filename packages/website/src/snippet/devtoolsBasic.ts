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
    position: 'BottomLeft',
  },
})

Runtime.run(application)
