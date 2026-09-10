import { Runtime } from 'foldkit'

const application = Runtime.makeApplication({
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
