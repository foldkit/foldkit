import { Effect, Result, Schema, Stream } from 'effect'
import { Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedAnimatePanel: {},
  FailedAnimatePanel: { error: Schema.String },
})

const ENTRANCE_DURATION_MS = 1000

const AnimatePanel = Mount.define('AnimatePanel', {
  messages: [Message.CompletedAnimatePanel, Message.FailedAnimatePanel],
  execute: ({ element, viewStateChanges }) =>
    Effect.gen(function* () {
      const { animation, finished } = yield* Effect.acquireRelease(
        Effect.try({
          try: () => {
            const animation = element.animate(
              [
                { opacity: 0, transform: 'translateY(16px)', offset: 0 },
                { opacity: 1, transform: 'translateY(0px)', offset: 1 },
              ],
              { duration: ENTRANCE_DURATION_MS, easing: 'ease-out' },
            )
            const finished = animation.finished.then(
              () => Result.succeed(undefined),
              error => Result.fail(error),
            )
            return { animation, finished }
          },
          catch: error => error,
        }),
        ({ animation }) => Effect.sync(() => animation.cancel()),
      )

      yield* Effect.try({ try: () => animation.pause(), catch: error => error })

      yield* Effect.raceFirst(
        Effect.promise(() => finished).pipe(Effect.flatMap(Effect.fromResult)),
        viewStateChanges.pipe(
          Stream.runForEach(viewState =>
            Effect.try({
              try: () => {
                if (animation.playState === 'finished') {
                  return
                }

                if (viewState === 'Live') {
                  animation.play()
                } else {
                  animation.pause()
                }
              },
              catch: error => error,
            }),
          ),
          Effect.andThen(Effect.never),
        ),
      )

      return Message.CompletedAnimatePanel()
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedAnimatePanel({
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      ),
    ),
})
