import type { createDevToolsStore } from '../devTools/store.js'
import type { forkManagedResourceFibers } from './managedResourceFibers.js'
import type { forkSubscriptionFibers } from './subscriptionFibers.js'

/** Runtime implementations of optional features.
 *
 *  The runtime never imports these directly. Each one is registered by the code
 *  that enables the feature: `Subscription.make`, `ManagedResource.make`, or the
 *  DevTools overlay registration the Foldkit Vite plugin injects. A bundle that
 *  never uses a feature leaves its implementation, and the Effect modules it
 *  pulls in, out of the build. */
export const featureRegistry: {
  forkSubscriptionFibers?: typeof forkSubscriptionFibers
  forkManagedResourceFibers?: typeof forkManagedResourceFibers
  createProductionDevToolsStore?: typeof createDevToolsStore
} = {}
