import { Application, Runtime } from 'foldkit'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    maxEntries: 250,
  },
})

Runtime.run(application)
