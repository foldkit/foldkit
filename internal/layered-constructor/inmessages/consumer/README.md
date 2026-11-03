# InMessage chat consumer

This isolated copy starts from `../../contract-provisioning`. The original
reference is unchanged. Its transport, socket Commands, Subscription,
ManagedResource, private input-focus Mount, deferred child initialization, and
Program tests are retained.

Composer declares `RequestedClear` and `RequestedSubmit` as InMessages.
`inMessageUpdate.ts` handles them independently of the local Message update. The local
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
`verification/run-ECUyVC/`.

The dependency-identity and AST placement checks already pass. The same complete
Composer InMessage update expression appears in an imported module, a constructor-local
value, and the constructor return. Room Binding/update/InMessage update placements also
preserve the complete source expressions. Four deliberate AST changes are
detected.

## Run

From this directory, after building the matching framework packages:

```sh
node verify.mjs
```

The verifier stages the consumer in a private temporary directory and resolves
the existing repository's compiler, Vitest and framework dependencies there. It
records source checks, tests, dependency identity, placement controls and the
runtime mutation control under a fresh `verification/` directory. No fixture
installation or source-worktree dependency mutation is required.

`generate-placements.mjs` refreshes the constructor-local and inline source from
the extracted builders. Format the generated files before running the AST check.

All original runtime assertions are preserved. The original Composer behavior
test runs against all three InMessage update placements. The normal Program test still
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
InMessage update exhaustiveness. They are compile-only fixtures and are never imported
by a runtime test.

These chat requests have no payload and no context. Payload-bearing and
context-bearing protocol coverage belongs to the framework gates, rather than
invented chat features. This verifier does not claim emitted-declaration or
source-free relocation coverage.
