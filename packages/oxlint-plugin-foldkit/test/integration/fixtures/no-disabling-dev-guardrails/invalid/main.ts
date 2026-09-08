import { Runtime as AppRuntime } from 'foldkit'

import { init, Model, update, view } from './app'

export const app = AppRuntime.makeApplication({
  Model,
  init,
  update,
  view,
  freezeModel: false,
})
