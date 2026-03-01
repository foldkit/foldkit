import { Runtime } from 'foldkit'

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  slowViewThresholdMs: 50,
})

Runtime.run(element)
