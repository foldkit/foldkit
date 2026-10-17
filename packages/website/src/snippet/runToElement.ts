import { Runtime } from 'foldkit'

import { ApplicationComposition, init, update, view } from './application'

const element = ApplicationComposition.makeElement({
  init,
  update,
  view,
  container: document.getElementById('widget'),
})

Runtime.run(element)
