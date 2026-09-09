import { Effect, Equivalence, Queue, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  AdvancedAutoScrollFrame: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  isDragging: Schema.Boolean,
  clientY: Schema.Number,
})
type Model = typeof Model.Type

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  autoScroll: entry(
    {
      isDragging: Schema.Boolean,
      clientY: Schema.Number,
    },
    {
      modelToDependencies: model => ({
        isDragging: model.isDragging,
        clientY: model.clientY,
      }),
      // Only restart the stream when isDragging changes.
      // Without this, every clientY change (every pixel) would tear down
      // and recreate the requestAnimationFrame loop.
      keepAliveEquivalence: Equivalence.Struct({
        isDragging: Equivalence.Boolean,
      }),
      // readDependencies returns the latest dependencies without restarting the stream.
      // The rAF loop calls readDependencies() each frame to get the current clientY.
      dependenciesToStream: ({ isDragging }, readDependencies) =>
        Stream.when(
          Stream.callback<typeof Message.AdvancedAutoScrollFrame.Type>(queue =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const animationFrameIdRef = { current: 0 }
                const step = () => {
                  const { clientY } = readDependencies()
                  window.scrollBy(0, clientY > window.innerHeight - 40 ? 5 : 0)
                  Queue.offerUnsafe(queue, Message.AdvancedAutoScrollFrame())
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
  ),
}))
