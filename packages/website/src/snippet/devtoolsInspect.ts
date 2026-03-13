import { Runtime } from 'foldkit'

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  devtools: {
    show: 'Always',
    mode: 'Inspect',
    banner: 'Welcome to our app! Browse the state tree to see how it works.',
  },
})

Runtime.run(element)
