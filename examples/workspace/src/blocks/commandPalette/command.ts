import { Effect, Schema } from 'effect'
import { Dom } from 'foldkit'

import { CommandPaletteDefinition } from './definition'
import { Message } from './message'

export const ScrollActiveResult = CommandPaletteDefinition.makeCommand(
  'ScrollActiveResult',
  {
    args: { index: Schema.Number },
    messages: [Message.CompletedScrollActiveResult],
    handler: function* () {
      return ({ index }) =>
        Dom.scrollIntoView(
          `[data-command-palette-result-index="${index}"]`,
        ).pipe(Effect.ignore, Effect.as(Message.CompletedScrollActiveResult()))
    },
  },
)
