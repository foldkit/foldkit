import { Effect, Number } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message, Model } from './counterParts'

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },

      update: {
        ClickedDecrement: model => ({
          model: modifyFields(model, { count: Number.decrement }),
        }),
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
        ClickedReset: model => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
      },
    }
  }),
)
