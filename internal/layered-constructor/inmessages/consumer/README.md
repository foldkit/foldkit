# InMessage chat consumer

This isolated copy starts from `../../contract-provisioning`. The original
reference is unchanged. Its transport, socket Commands, Subscription,
ManagedResource, private input-focus Mount, deferred child initialization, and
Program tests are retained.

Composer declares `RequestedClear` and `RequestedSubmit` as InMessages.
`receive.ts` handles them independently of the local Message update. The local
`SubmittedForm` fact and incoming submit request share the extracted
`submitMessage` Step. The sparse `inMessageOutputs` contract keeps clear silent
and permits submit to emit `Submitted`.

Room likewise separates incoming `RequestedDisconnect` from the local
`ClickedDisconnect` fact. Its extracted `recordSentMessage` pipeline still calls
`MessageComposerBinding.requestClear()` without a mapping or constructor-local
instance parameter.

## Status

The complete verifier passes against the matching canonical framework build:
source typing, 15 tests, dependency identity, source placement checks, and the
successful-send clearing regression control. Results and command logs are in
`verification/run-9P6QPA/`.

The dependency-identity and AST placement checks already pass. The same complete
Composer receive expression appears in an imported module, a constructor-local
value, and the constructor return. Room Binding/update/receive placements also
preserve the complete source expressions. Four deliberate AST changes are
detected.

## Run

From this directory, after building the matching framework packages:

```sh
node verify.mjs
```

The verifier records every command and its log under a fresh `verification/`
directory. Its individual commands are:

```sh
node check-runtime-dependencies.mjs
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run --config vitest.config.ts
node check-placements.mjs
node check-runtime-mutation.mjs
```

`generate-placements.mjs` refreshes the constructor-local and inline source from
the extracted builders. Format the generated files before running the AST check.

All original runtime assertions are preserved. The original Composer behavior
test runs against all three receive placements. The normal Program test still
exercises actual focus, send, successful clear, reply/timestamp, disconnection,
and cleanup with controlled sockets. The collection test retains independent
direct and keyed room occurrences and removal/recreation.

The new Story and Scene test submits and clears through `inMessage`, interleaved
with ordinary local Messages and DOM interactions. Room intentionally omits
`inMessageOutputs`; its disconnect input is silent by default. Graph construction
needs no socket provider. The actual Program receives the WebSocket constructor
Service when it executes the existing transport handlers.

`requests.accepted.ts` and `requests.rejected.ts` cover generated zero-argument
methods, exact silent/emitting channels, local/input dispatch separation, and
receive exhaustiveness. They are compile-only fixtures and are never imported
by a runtime test.

These chat requests have no payload and no context. Payload-bearing and
context-bearing protocol coverage belongs to the framework gates, rather than
invented chat features. This verifier does not claim emitted-declaration or
source-free relocation coverage.
