import { Effect } from 'effect'

import { Application } from './application'
import { init, updateHandlers } from './todo'
import { view } from './view.optimised'

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: init().model,
      update: updateHandlers,
      view,
    }
  }),
)
