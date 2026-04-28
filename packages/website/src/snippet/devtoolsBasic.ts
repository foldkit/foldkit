import { Runtime } from 'foldkit'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  devTools: {
    position: 'BottomLeft',
  },
})

Runtime.run(program)
