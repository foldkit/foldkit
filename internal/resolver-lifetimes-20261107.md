# Story and Scene resolver lifetimes

## Decision

`Story.Command.resolveAll` and `Scene.Command.resolveAll` now use only the
resolvers supplied to that call. Each resolver still consumes one matching
Command in dispatch order, and result Messages still cascade through Commands
produced during the same call. Unmatched supplied resolvers are discarded when
the call ends. Unrelated actual Commands remain pending and retain the existing
assertion and final-completeness failures.

`resolveAllExact` remains local and strict: every supplied resolver must match
and no actual Command may remain. No persistent responder API was added.

## Implementation

The shared resolver loop now keeps its remaining resolvers in a local variable.
Story and Scene simulations no longer store resolver state, and the obsolete
cross-call matcher fingerprints and latest-wins replacement machinery were
removed. Command source identity, complete instance args, Binding occurrence
matching, repeated response order, interruption, and the cascade-depth limit
continue through the existing matching and resolution paths.

The focused lifetime regressions call `resolveAll()` after a later dispatch and
assert that the previously unmatched response is unavailable. A Story example
also reuses one extracted local resolver step explicitly at each intended
completion point.

## Migration

Most callers need no source change because they already supply responses beside
the pending Commands they resolve. A caller that deliberately relied on an
unused resolver in a later call should extract the local resolver step and place
it again after each dispatch:

```ts
const completeFetch = Story.Command.resolveAll([
  FetchCount,
  Message.SucceededFetchCount({ count: 7 }),
])

Story.story(
  subject,
  Story.init(),
  Story.message(Message.ClickedFetch()),
  completeFetch,
  Story.message(Message.ClickedFetch()),
  completeFetch,
)
```

The focused audit found intentional cross-call retention only in the framework
contract tests. Two lower-level identity tests also staged resolvers before
Commands solely to exercise the old cache; they now verify same-name Definition
identity and Binding-path identity with pending Commands and local resolvers in
one call. No application or example consumer reliance was discovered.

## Verification

- `vitest run src/test/story.test.ts src/test/scene.test.ts src/test/sourceIdentity.test.ts src/test/bindingMatcher.test.ts`: 881 tests passed.
- Full Foldkit `vitest run`: 4,309 tests passed and one skipped.
- `tsc -p tsconfig.json --noEmit`: passed.
- Oxfmt check for every changed source, test, and report file: passed.
- Focused restored-carry mutation: both Story and Scene discard regressions failed; after restoring the local implementation, both passed.
