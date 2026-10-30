import { Effect } from 'effect'
import { Block } from 'foldkit'

import { Message, Model, init, updateHandlers, view } from './todo'

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: init().model,
      update: updateHandlers,
      view,
    }
  }),
)
