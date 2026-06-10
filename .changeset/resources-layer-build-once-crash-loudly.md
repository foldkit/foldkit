---
'foldkit': minor
---

Build the `resources` Layer once per runtime and surface its construction failures in the crash view.

**Fixed:** the `resources` Layer is now built once, the first time it is needed: at startup in an app that declares Subscriptions (their pipelines run for the application's lifetime), otherwise when the first Command runs. The built services are shared from then on and released at runtime teardown. This was always the documented contract, but the runtime previously rebuilt the Layer on every Command invocation and tore it down when the Command finished, so an RPC client in `resources` was reconstructed per call and an `AudioContext` was never actually shared between Commands.

**Changed:** a `resources` Layer that fails to build now renders the crash view. Previously the failure killed each Command fiber silently: every Command in the app stopped working with nothing in the console or on screen. A failure escaping a Command or Subscription fiber is unrecoverable by construction (their effects are typed never-failing), so the runtime treats it as fatal: it renders the crash view with the underlying error, reports through `crash.report` once, and stops rendering model updates so the crash view stays visible.
