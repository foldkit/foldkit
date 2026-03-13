import { Runtime } from 'foldkit'

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  devtools: {
    position: 'BottomLeft',
  },
})

Runtime.run(element)
