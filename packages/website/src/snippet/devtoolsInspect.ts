import { Runtime } from 'foldkit'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  devTools: {
    show: 'Always',
    mode: 'Inspect',
    banner: 'Welcome to our app! Browse the state tree to see how it works.',
  },
})

Runtime.run(program)
