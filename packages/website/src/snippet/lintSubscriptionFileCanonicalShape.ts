import { Subscription } from 'foldkit'

// ❌ Bad
// Spreading subscription records into a plain object lets a duplicate key in
// the second record silently overwrite the first.
const spreadSubscriptions = {
  ...keyboardSubscriptions,
  ...clockSubscriptions,
}

// ✅ Good
// Aggregate every record into one canonical `subscriptions` export, so
// duplicate keys fail loudly at startup.
export const subscriptions = Subscription.aggregate<Model, Message>()(
  keyboardSubscriptions,
  clockSubscriptions,
)
