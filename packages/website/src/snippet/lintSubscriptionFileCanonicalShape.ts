import { Subscription } from 'foldkit'

// ❌ Bad
// Spreading subscription records into a literal lets duplicate keys silently win.
export const subscriptions = {
  ...keyboardSubscriptions,
  ...clockSubscriptions,
}

// ✅ Good
// Aggregate through Subscription.aggregate so duplicate keys fail loudly.
export const subscriptionsFixed = Subscription.aggregate<Model, Message>()(
  keyboardSubscriptions,
  clockSubscriptions,
)
