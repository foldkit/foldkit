# Story concurrent Message delivery

## Status

Story now accepts ordinary Messages while Commands from earlier steps remain
pending. The consumer API remains `Story.message(message)`. No concurrency
mode, option, or alternate Message step was added.

This work is based on commit
`679d2d5e7fae638f7aa0dbce65440da0ce767331` in the shared preview checkout and
includes subsequent followup work. Publication remains held for the user's approval; the safe development branch is separate from release integration.

## Semantics

Each Message runs update against the current Model. Commands that were already
pending stay in their original order, and Commands returned by the Message are
appended. Dispatch never resolves, drops, or replaces pending Commands.

`Story.Command.resolve` remains explicit. Definition and instance matching,
complete argument identity, scoped Binding identity, missing-match errors, and
ambiguous-match errors are unchanged. `resolveAll` and `resolveAllExact` retain
their existing ordered consumption, cascade, resolver carry-over, and exactness
contracts. Stored resolvers are not applied merely because a Message dispatches
a matching Command.

Keyed, interrupt, and ordinary Commands now share the same Message delivery
rule in Story. Resolving an Interrupt still drops only pending Commands with
its matching interrupt key. `Story.story` still fails when any Command remains
pending at the end.

Model, Message, and OutMessage channel types are unchanged. `Story.steps`
continues to preserve those channels through nested groups.

## Implementation

The runtime change removes the pre-dispatch unresolved-Command assertion from
`packages/foldkit/src/test/story.ts`. The existing update path already retained
prior Commands and appended Commands produced by the next Message, so no new
pending-work representation or resolver path was introduced.

Source SHA-256:

- `story.ts`: `648c18bb5b4e5b908dbfa200631a0daa26602ea6115ca09c4c034b586f4ecf1f`
- `story.test.ts`: `45526d5669f6ec3e5fc738ff6641734ab09394c498f43b9e1648bb463befda2f`

Built Story artifacts from the coordinated forced Foldkit build:

- `dist/test/story.js`: `b394ea6213381d49164cae08b898fd04befc67eeb6caa03cad4b1a58b101e129`
- `dist/test/story.d.ts`: `65e383f20fd8c60a93cc06600c1d84b4e4590b4b8f0a3b8c88532950d37ba848`
- `dist/story/public.js`: `69697cb36adf5a409f51f31dbbf1433929e4d8b53d614b10e712199ac2f478f0`
- `dist/story/public.d.ts`: `57c004cd4f52031f28ed95858762471e1a5e260300969975ff57fc6ab6478b00`

## Verification

The focused Story suite passes 70 tests. It covers:

- one ordinary Command retained across a later Message;
- Commands from concurrent Messages retained in dispatch order;
- nested `Story.steps` groups;
- explicit ordered resolution after concurrent delivery;
- unchanged missing and ambiguous matcher failures;
- every ordinary pending Command reported at story completion;
- existing keyed, interrupt, resolver carry-over, exact resolution, mapper, and
  OutMessage behavior.

Dedicated declaration fixtures are:

- `story-concurrency.accepted.ts`;
- `story-concurrency.rejected.ts`;
- `story-concurrency.consume.ts`;
- `tsconfig.story-concurrency.source.json`.

They cover nested Message groups, exact Model, Message, resolver-result, and
OutMessage channels, and relocated use of the emitted declarations. The direct
source fixture passes. The complete emitted-declaration harness passes external
emission, rejected wiring, strict relocation, native completion checks, and
compiler diagnostics with TypeScript `7.1.0-beta`.

Commands used for the focused evidence:

```text
packages/foldkit/node_modules/.bin/vitest run packages/foldkit/src/test/story.test.ts
packages/foldkit/node_modules/.bin/tsc -p packages/foldkit/declaration-tests/tsconfig.story-concurrency.source.json
cd packages/foldkit && node scripts/check-emitted-declarations.ts
```

A mutation restoring the removed pre-dispatch guard fails the new concurrent
Message case with the expected unresolved `FetchCount` error. Restoring the
exact source in the isolated copy passes both Story and headless helper suites
(77 tests). Logs are retained at
`/private/tmp/foldkit-followup-mutation-20261025`. An initial missing-base-config
harness failure is excluded from this evidence.

## Workspace adoption

Three Workspace stories now begin the actual Command before delivering a
concurrent Message:

- the root Board story keeps a pending `MoveIssue`, receives a teammate comment,
  verifies that the optimistic move and Command remain pending, then resolves a
  persistence failure and verifies that rollback preserves the comment;
- the Issue Detail story begins `SaveIssue`, receives a concurrent comment,
  verifies the exact Command remains pending, and resolves the save;
- the Project Settings story begins one `SaveProject`, delivers duplicate
  submission, edit, discard, and retry Messages, verifies that no duplicate
  Command was added, and resolves the original save.

The three focused Workspace files pass 45 tests. Workspace source typechecking
and scoped application lint pass. The root Workspace story also passed its
30-test file independently immediately after the coordinated Foldkit build.

Other tests that construct a pending Model directly remain when the pending
state itself is the subject, when they intentionally inject an unsolicited or
mismatched result without a matching Command, or when starting the real Command
would add unrelated lifecycle behavior to the assertion. The migration does not
turn every `Saving` or `Creating` fixture into an end-to-end Command story.

## Guidance follow-up

The active Story guide now explains that Message delivery retains every pending
Command for explicit resolution and that `story` still enforces completeness at
the end. Its `testingConcurrentMessages` snippet demonstrates the intended
chronological flow. The testing guide and consumer skill references carry the
same contract.

The historical interruptible-Command changelog entries remain historical.
Scene still uses `assertNoUnresolvedCommands` before Subscription and browser
interaction Messages, so its source error guidance remains valid and this
change does not broaden Scene behavior.
