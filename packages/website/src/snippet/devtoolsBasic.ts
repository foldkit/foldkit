import { Application, Runtime } from 'foldkit'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    position: 'BottomLeft',
  },
})

Runtime.run(application)
