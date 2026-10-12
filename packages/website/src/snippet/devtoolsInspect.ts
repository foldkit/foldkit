import { Application, Runtime } from 'foldkit'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    banner: 'Welcome to our app! Browse the state tree to see how it works.',
  },
})

Runtime.run(application)
