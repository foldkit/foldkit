import { Application, Runtime } from 'foldkit'

import { Live, Message, Model, init, subscriptions, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    Message,
    excludeFromHistory: [
      'TickedFrame',
      'MovedPointer',
      'CompletedGenerateAmbientParticle',
    ],
  },
})

Runtime.run(Application.provide(application, Live))
