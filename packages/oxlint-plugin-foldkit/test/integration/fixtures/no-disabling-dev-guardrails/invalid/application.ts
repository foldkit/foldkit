import { defineApplication } from 'foldkit'

import { init, Message, Model, update, view } from './implementation'

const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition({})

export const application = Application.makeComposition().makeApplication({
  init,
  update,
  view,
  freezeModel: false,
})

export const registeredApplication = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  slow: false,
})
