import { Array, Effect, Record, pipe } from 'effect'
import { Block } from 'foldkit'

import { FAQ_IDS } from './faq'
import { Message } from './message'
import { Model } from './model'
import { type ViewInputs, view } from './view'

export class ComingFromReact extends Block<ComingFromReact, void, ViewInputs>()(
  'ComingFromReact',
  { Model, Message },
) {}

export const ComingFromReactLive = ComingFromReact.make(
  Effect.fn(function* () {
    return {
      model: pipe(
        FAQ_IDS,
        Array.map(id => [id, false] as const),
        Record.fromEntries,
      ),

      update: {
        ToggledFaq: (model, { id, isOpen }) => ({
          model: Record.set(model, id, isOpen),
        }),
      },

      view,
    }
  }),
)
