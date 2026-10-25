import { Effect, Layer, Option, Stream } from 'effect'

import { expect, it } from '@effect/vitest'

const BoardEventsTestLayer = Layer.succeed(BoardEvents, {
  entries: (_boardId, maybeAfter) => {
    const seq = Option.getOrElse(maybeAfter, () => 0) + 1

    return Stream.make({
      seq,
      state: boardAfter(seq),
      meta: { intentId: `intent-${seq}` },
    })
  },
})

it.effect('opens the feed after the snapshot cursor', () =>
  Effect.gen(function* () {
    const watching = orderBoardQuery.requestWatch(
      orderBoardQuery.init().model,
      { args, maybeSnapshot: Option.some({ state: boardAfter(4), cursor: 4 }) },
    ).model

    // Run the canonical handler with a test BoardEvents service.
    const messages = yield* Stream.runCollect(
      orderBoardQuery.Feeds.dependenciesToStream(
        orderBoardQuery.Feeds.modelToDependencies(watching),
      ),
    ).pipe(
      Effect.provide(
        Layer.provide(orderBoardQuery.EffectsLayer, BoardEventsTestLayer),
      ),
    )

    const settled = Array.reduce(
      messages,
      watching,
      (model, feedMessage) => orderBoardQuery.update(model, feedMessage).model,
    )

    expect(orderBoardQuery.readCursor(settled, args)).toEqual(Option.some(5))
  }),
)
