import { Effect, Equivalence, Queue, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedAutoScroll = m('CompletedAutoScroll')

const Message = S.Union([CompletedAutoScroll])
type Message = typeof Message.Type

const Model = S.Struct({
  isDragging: S.Boolean,
  clientY: S.Number,
})

type Model = typeof Model.Type

const SubscriptionDeps = S.Struct({
  autoScroll: S.Struct({
    isDragging: S.Boolean,
    clientY: S.Number,
  }),
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  autoScroll: {
    modelToDependencies: model => ({
      isDragging: model.isDragging,
      clientY: model.clientY,
    }),
    // Only restart the stream when isDragging changes.
    // Without this, every clientY change (every pixel) would tear down
    // and recreate the requestAnimationFrame loop.
    equivalence: Equivalence.Struct({ isDragging: Equivalence.Boolean }),
    // readDependencies returns the latest dependencies without restarting the stream.
    // The rAF loop calls readDependencies() each frame to get the current clientY.
    dependenciesToStream: ({ isDragging }, readDependencies) =>
      Stream.when(
        Stream.callback<typeof CompletedAutoScroll.Type>(queue =>
          Effect.acquireRelease(
            Effect.sync(() => {
              const animationFrameIdRef = { current: 0 }
              const step = () => {
                const { clientY } = readDependencies()
                window.scrollBy(0, clientY > window.innerHeight - 40 ? 5 : 0)
                Queue.offerUnsafe(queue, CompletedAutoScroll())
                animationFrameIdRef.current = requestAnimationFrame(step)
              }
              animationFrameIdRef.current = requestAnimationFrame(step)
              return animationFrameIdRef
            }),
            animationFrameIdRef =>
              Effect.sync(() =>
                cancelAnimationFrame(animationFrameIdRef.current),
              ),
          ).pipe(Effect.flatMap(() => Effect.never)),
        ),
        Effect.sync(() => isDragging),
      ),
  },
})
