import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { EffectsLayer } from './layer'
import { Message, Model, init, subscriptions, update, view } from './main'

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

pipe(application, Application.provide(EffectsLayer), Runtime.run)
