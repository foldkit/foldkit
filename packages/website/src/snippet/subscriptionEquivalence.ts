import { Effect, Equivalence, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const EDGE_DISTANCE_PX = 40
const SCROLL_STEP_PX = 5

const Message = defineMessageUnion({
  MovedPointer: { clientY: Schema.Number },
  AdvancedAutoScrollFrame: {},
})
type AdvancedAutoScrollFrame = typeof Message.AdvancedAutoScrollFrame.Type

const AutoScrollDependencies = Schema.Struct({
  isDragging: Schema.Boolean,
  clientY: Schema.Number,
})
type AutoScrollDependencies = typeof AutoScrollDependencies.Type

export class Drag extends Block<Drag>()('Drag', {
  Model: Schema.Struct({ isDragging: Schema.Boolean, clientY: Schema.Number }),
  Message,
}) {}

const autoScrollFrames = (readDependencies: () => AutoScrollDependencies) =>
  Stream.callback<AdvancedAutoScrollFrame>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const animationFrameIdRef = { current: 0 }
        const step = () => {
          const { clientY } = readDependencies()
          if (clientY > window.innerHeight - EDGE_DISTANCE_PX) {
            window.scrollBy(0, SCROLL_STEP_PX)
          }
          Queue.offerUnsafe(queue, Message.AdvancedAutoScrollFrame())
          animationFrameIdRef.current = requestAnimationFrame(step)
        }
        animationFrameIdRef.current = requestAnimationFrame(step)
        return animationFrameIdRef
      }),
      animationFrameIdRef =>
        Effect.sync(() => cancelAnimationFrame(animationFrameIdRef.current)),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

export const DragLive = Drag.make(
  Effect.fn(function* () {
    return {
      model: { isDragging: false, clientY: 0 },

      update: {
        MovedPointer: (model, { clientY }) => ({
          model: modifyFields(model, { clientY: () => clientY }),
        }),
        AdvancedAutoScrollFrame: model => ({ model }),
      },

      subscriptions: {
        autoScrollDuringDrag: {
          dependencies: model => ({
            isDragging: model.isDragging,
            clientY: model.clientY,
          }),
          keepAliveEquivalence: Equivalence.Struct({
            isDragging: Equivalence.Boolean,
          }),
          stream: (
            { isDragging }: AutoScrollDependencies,
            readDependencies: () => AutoScrollDependencies,
          ) => (isDragging ? autoScrollFrames(readDependencies) : Stream.empty),
        },
      },
    }
  }),
)
