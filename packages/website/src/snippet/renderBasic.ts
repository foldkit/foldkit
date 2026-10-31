import { Effect, Schema } from 'effect'
import { Command, Render } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedMeasurePanel: { width: Schema.Number },
  CompletedStartTransition: {},
})

export const MeasurePanel = Command.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
})

export const StartTransition = Command.define('StartTransition', {
  messages: [Message.CompletedStartTransition],
})

// Handlers returned under `commands` in a Block's constructor:
export const commands = {
  MeasurePanel: () =>
    Effect.gen(function* () {
      yield* Render.afterCommit
      const element = document.getElementById('panel')
      const width =
        element instanceof HTMLElement
          ? element.getBoundingClientRect().width
          : 0
      return Message.CompletedMeasurePanel({ width })
    }),
  StartTransition: () =>
    Render.afterPaint.pipe(Effect.as(Message.CompletedStartTransition())),
}
