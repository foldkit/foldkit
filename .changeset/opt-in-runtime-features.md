---
'foldkit': patch
---

Leave runtime features an application does not use out of its production bundle. The runtime imported the Subscription, ManagedResource, and DevTools store implementations directly and decided at runtime whether to start each one. Bundlers cannot evaluate those runtime checks, so every production bundle included all three, along with the Effect Stream, PubSub, HashMap, and Schema code they depend on, even in an application that uses none of them.

`Subscription.make` and `ManagedResource.make` now install their runtime when an application calls them, and the runtime starts each feature only through what was installed. The DevTools store is installed together with the DevTools overlay, so a production build includes it only when it includes the overlay, which is when `@foldkit/devtools` is in regular `dependencies`. In the Counter, Todo, Form, and Shopping Cart examples the gzipped production bundle shrinks by about 6 KB (6%). Examples that use Subscriptions or ManagedResources shrink by 4 to 5 KB.

Applications that create Subscriptions and ManagedResources through their `make` functions need no changes. Development builds include DevTools as before, and production builds that include the DevTools overlay show it as before. When an application passes Subscriptions or ManagedResources but never calls the matching `make` function, the runtime stops with an error naming that function.
