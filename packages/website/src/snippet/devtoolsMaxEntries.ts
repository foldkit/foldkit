import { Runtime } from 'foldkit'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    maxEntries: 250,
  },
})

Runtime.run(program)
