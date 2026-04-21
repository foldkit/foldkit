import { Runtime } from 'foldkit'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  freezeModel: {
    show: 'Always',
  },
})

Runtime.run(program)
