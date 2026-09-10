import { Subscription, click, role } from 'foldkit/scene'

// A Message whose real cause is a Subscription has no element in the
// rendered tree. Emit it directly; the step feeds it through update and
// re-renders like any other step.
Subscription.emit(Ticked())
Subscription.emit(ReceivedServerFrame({ frame }))

// Don't emit a Message that has a DOM affordance. Click the actual
// button instead; the interaction proves the handler wiring that emit skips.
click(role('button', { name: 'Log out' }))
