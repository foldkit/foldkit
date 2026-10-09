---
'foldkit': minor
---

Allow Layer-backed Subscriptions without local Model dependencies to use `entry('WatchHeartbeat')`. The name-only form keeps the Stream active across local Model updates and preserves its named handler Layer for application assembly. A parent may still gate the Subscription when lifting it.
