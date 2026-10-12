import { Application, Runtime } from 'foldkit'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    keyframeInterval: 1,
  },
})

Runtime.run(application)
