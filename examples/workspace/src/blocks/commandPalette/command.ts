import { Effect, Schema } from 'effect'
import { Dom } from 'foldkit'

import { CommandPaletteBlock } from './definition'
import { Message } from './message'

export const ScrollActiveResult = CommandPaletteBlock.makeCommand(
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
