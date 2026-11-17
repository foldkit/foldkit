---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

Derive all Subscription dependencies in one fiber per Model change and wake only the Subscriptions whose dependencies changed. Streams retain their dependency equivalence and access to the latest dependencies through `readDependencies`. This reduces per-Message scheduling overhead in applications with many Subscriptions.

Include `effect/MutableRef` in the Vite plugin's optimized Effect graph so the dependency follower can start in development builds.
