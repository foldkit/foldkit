import { Application, Runtime } from 'foldkit'

const application = Application.make({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    excludeFromHistory: ['TickedFrame', 'MovedPointer'],
  },
})

Runtime.run(application)
