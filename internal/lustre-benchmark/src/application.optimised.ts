import { Application } from './application'
import { init, updateHandlers } from './todo'
import { view } from './view.optimised'

export const ApplicationLive = Application.toLayer(() => ({
  init: () => init().model,
  update: updateHandlers,
  view,
}))
