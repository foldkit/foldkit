import { Stream } from 'effect'
import { Port } from 'foldkit'

import { widget } from './definition'
import { Message } from './message'
import { ports } from './ports'

// An inbound Port is a Subscription source. The handler maps every decoded
// value the host sends into a Message, so host input enters update the same way
// any other external event does.
export const subscriptions = widget.makeSubscriptions(entry => ({
  hostStepChanges: entry('HostStepChanges', {
    messages: [Message.ChangedStep],
    handler: function* () {
      return () =>
        Port.stream(ports.inbound.stepChanged).pipe(
          Stream.map(step => Message.ChangedStep({ step })),
        )
    },
  }),
}))
