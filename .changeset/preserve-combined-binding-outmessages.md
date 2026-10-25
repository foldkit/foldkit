---
'foldkit': minor
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/oxlint-plugin': patch
'create-foldkit-app': patch
---

Require exhaustive handler records in `Composition.makeUpdate`. Each handler receives the inferred Model and its exact Message variant, and operations retain the selected handler's visible Command requirements and OutMessage contract. Use `makeUpdate.withContext` for handlers that share dispatch context. The callback-taking overload is removed; message-free and routed-only Compositions use `makeUpdate({})`.

Reject `Update.combineSteps` calls that discard an OutMessage from a connected operation or its registered Binding policy. Silent operations remain composable even when another handler in the same Block emits an OutMessage. An individual handler mixing raw local results with connected recipes must use Definition-owned Steps for the local branches. Keep accurate helper return contracts: this check cannot reconstruct channels already erased upstream.

Retain an actionable runtime error for JavaScript and erased contracts. Return an emitting operation's complete result directly so its caller can observe the OutMessage.

Name public UI Block contracts through the existing checked assembly helpers so parent declarations can refer to their headers without repeatedly expanding their implementation. Preserve ordinary Model, Message, operation, and handler contracts. Extend the lint rules to recognize record updates, context factories, and checked named headers without allowing parent mutation or manual child routing.

Retain existing completed update and owned Document view contracts through named internal interfaces. Larger application declarations can reference those signatures without repeatedly serializing them. This changes neither consumer authoring nor runtime code; applications and libraries must still verify their own declaration output.

Use the record update form in generated SSR/SSG applications and explain local Step channels and checked public Block headers in the scaffold's authoring guidance.

Migrate the DevTools overlay to the handler-record form while preserving its transitions, Commands, and child routing.
