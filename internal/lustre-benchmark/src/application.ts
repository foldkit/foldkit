import { Block } from 'foldkit'

import { Message, Model, init, updateHandlers, view } from './todo'

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.toLayer(() => ({
  init: () => init().model,
  update: updateHandlers,
  view,
}))
