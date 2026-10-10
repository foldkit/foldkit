import { Effect, Stream } from 'effect'
import { Port, Subscription } from 'foldkit'

import { ports } from './ports'

// An inbound Port is a Subscription source. The handler maps every decoded
// value the host sends into a Message, so host input enters update the same way
// any other external event does.
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  hostStepChanges: entry('HostStepChanges', {
    messages: [ChangedStep],
  }),
}))

export const HostStepChangesLayer = subscriptions.hostStepChanges.toLayer(
  Effect.succeed(() =>
    Port.stream(ports.inbound.stepChanged).pipe(
      Stream.map(step => ChangedStep({ step })),
    ),
  ),
)
