import { ApplicationComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import { update } from './update'
import { view } from './view'
ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})
