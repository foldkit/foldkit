import { Array, Number, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Stopwatch } from './blockStopwatchChild'

const Model = Schema.Struct({
  pinned: Schema.Array(Stopwatch),
  others: Schema.Array(Stopwatch),
  nextStopwatchId: Schema.Number,
})
type Model = typeof Model.Type

export class TimerBoard extends Block<TimerBoard>()('TimerBoard', {
  Model,
  Message: defineMessageUnion({
    ClickedPin: { id: Schema.String },
    ClickedRestart: { id: Schema.String },
  }),
}) {}

const hasId =
  (id: string) =>
  (stopwatch: Stopwatch): boolean =>
    stopwatch.id === id

const pin = (model: Model, id: string): Model =>
  Option.match(Array.findFirst(model.others, hasId(id)), {
    onNone: () => model,
    onSome: stopwatch =>
      modifyFields(model, {
        pinned: Array.append(stopwatch),
        others: Array.filter(other => other.id !== id),
      }),
  })

const restart = (model: Model, id: string): Model => {
  const replaceMatching = Array.map((stopwatch: Stopwatch) =>
    stopwatch.id === id
      ? new Stopwatch(`stopwatch-${model.nextStopwatchId}`, {
          label: stopwatch.model.label,
        })
      : stopwatch,
  )

  return modifyFields(model, {
    pinned: replaceMatching,
    others: replaceMatching,
    nextStopwatchId: Number.increment,
  })
}

export const TimerBoardLive = TimerBoard.toLayer(() => ({
  init: () => ({
    pinned: [],
    others: [
      new Stopwatch('stopwatch-0', { label: 'Tea' }),
      new Stopwatch('stopwatch-1', { label: 'Pasta' }),
    ],
    nextStopwatchId: 2,
  }),

  update: {
    // Same instance, new field: it keeps its state and keeps ticking
    ClickedPin: (model, { id }) => ({ model: pin(model, id) }),
    // New id: the old stopwatch stops and a fresh one starts at zero
    ClickedRestart: (model, { id }) => ({ model: restart(model, id) }),
  },

  view: (model, h) => {
    const restartButton = (stopwatch: Stopwatch) =>
      h.button(
        [h.OnClick(TimerBoard.Message.ClickedRestart({ id: stopwatch.id }))],
        ['Restart'],
      )

    return h.div(
      [],
      [
        h.ul(
          [],
          Array.map(model.pinned, stopwatch =>
            h.keyed('li')(
              stopwatch.id,
              [],
              [stopwatch.view(), restartButton(stopwatch)],
            ),
          ),
        ),
        h.ul(
          [],
          Array.map(model.others, stopwatch =>
            h.keyed('li')(
              stopwatch.id,
              [],
              [
                stopwatch.view(),
                h.button(
                  [
                    h.OnClick(
                      TimerBoard.Message.ClickedPin({ id: stopwatch.id }),
                    ),
                  ],
                  ['Pin'],
                ),
                restartButton(stopwatch),
              ],
            ),
          ),
        ),
      ],
    )
  },
}))
