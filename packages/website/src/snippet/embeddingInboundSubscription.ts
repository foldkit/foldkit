import { Port, Subscription } from 'foldkit'

import { ports } from './ports'

// An inbound Port is a Subscription source. Port.subscription wraps every
// decoded value the host sends into a Message, so host input enters update
// the same way any other external event does.
export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  hostStep: Port.subscription(ports.inbound.stepChanged, step =>
    ChangedStep({ step }),
  ),
}))
