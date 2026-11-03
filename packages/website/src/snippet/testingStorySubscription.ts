import { Effect } from 'effect'
import { Subscription, given, model, story, withBlock } from 'foldkit/story'

// The selected implementation owns this registry; Streams are not executed.
await Effect.runPromise(
  withBlock(OrderFeedImplementation, block =>
    story(
      block.update,
      given(block.init().model),
      Subscription.emit(
        block.subscriptions.entries,
        block.Message.ReceivedEntry({ sequence: 13, order }),
      ),
      model(model => {
        expect(model.latestSequence).toBe(13)
      }),
    ),
  ),
)
