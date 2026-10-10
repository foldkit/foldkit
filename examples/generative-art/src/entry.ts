import { Application, Runtime } from 'foldkit'

import {
  EffectsLayer,
  Message,
  Model,
  init,
  mounts,
  subscriptions,
  update,
  view,
} from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  subscriptions,
  mounts,
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

Runtime.run(Application.provide(application, EffectsLayer))
