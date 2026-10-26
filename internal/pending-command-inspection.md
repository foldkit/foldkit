# Pending Command argument inspection

## Decision

Story and Scene expose identity-based argument projection through
`Command.argsOf`:

```ts
const maybeArgs = Story.Command.argsOf(Paint)(pending)
```

The result is `Option<exact captured args>`. A matching argless Definition
returns `Some(undefined)`, which remains distinguishable from `None` for a
different source. The same contract is available from `Scene.Command.argsOf`.

Projection is deliberately separate from selection. It matches every pending
Command with the Definition's source identity across qualified, bound, and
keyed occurrences. A caller that needs one occurrence inspects the matching
collection and states its own cardinality or selection rule. Existing resolver
ambiguity checks and occurrence-aware internal component helpers remain
unchanged.

## Runtime contract

The helper requires registered identity on both the Definition and pending
metadata before it delegates to the existing Command matcher. A same-named
foreign Definition and a name-only object therefore return `None`.

On a match, the helper returns the pending value's original `args` reference.
It does not construct a Command, decode a Schema, execute an Effect, mutate the
pending value, narrow or rebrand the pending value, or change its qualified
name, interrupt key, result channel, Error, or service requirements.

Runtime tests cover real Story and Scene captures, qualified child delivery,
same-name impostors, repeated inspection, multiple occurrences, keyed Commands
and Interrupts, argless Commands, defaulted args, unchanged ambiguity behavior,
reference preservation, and passive inspection.

## Type contract

`CommandArgs<Definition>` distributes over Definition unions. It projects an
`args` member from each invocation return, returns `undefined` for a true
zero-argument Definition and an argless Interrupt, and retains
`Record<string, unknown> | undefined` when the Definition has already been
erased to the resolver boundary. This preserves defaulted, generic, refined,
union, interruptible, and argless Definition behavior.

The public signature is emitted directly on the `Command.argsOf` property in
Story and Scene. This matters for both portability and compiler cost: inferred
split-file helpers retain exact args and simulation channels without exporting
identity proofs or replacing the pending Command type.

The declaration fixtures exercise source checking, rejected inputs, emitted
declarations, relocation, and a realistic split-file helper that extracts args
before constructing an exact resolver.

The active Story and Scene guides document the same projection and share a
snippet that maps `argsOf` across pending Commands, requires exactly one match,
then reconstructs an exact instance for resolution. The Foldkit minor changeset
records the additive public API.

## Compiler budget

The earlier safe prototype emitted a separate generic helper declaration. In
the eight-group workspace fixture that added 84 Instantiations and 52 Types,
despite moving the helper into the already loaded internal declaration module.

The adopted encoding keeps the distributive `CommandArgs` type in that existing
module and emits the generic function signature inline on both public
properties. Isolated controls with the pinned TypeScript 7.1.0-beta compiler
produce these baseline-subtracted counts:

| Fixture                             | Instantiations |   Types | Existing ceiling    |
| ----------------------------------- | -------------: | ------: | ------------------- |
| Workspace composition, four groups  |      2,639,490 | 206,262 | 2,639,574 / 206,314 |
| Workspace composition, eight groups |      4,515,010 | 280,523 | 4,515,010 / 280,523 |

No compiler ceiling changes are required. The runtime function remains
centralized in the existing Binding matcher module, while small inline wrappers
control the emitted public declarations. This split is intentional: assigning
the generic helper directly would reintroduce a reachable standalone
declaration and the measured excess.

Focused verification passed with the pinned compiler against the isolated
package declarations: accepted and rejected fixtures, declaration emission,
relocated consumption, and the active documentation snippet. The focused
runtime suite passes eight tests, the full Foldkit suite passes 3,685 tests,
and the Website documentation registry passes its 929 tests.

## Maintenance constraints

- Keep identity checks on both inputs before allowing the name fallback in the
  shared matcher.
- Keep the public property signatures inline unless a replacement encoding is
  measured against both workspace fixtures.
- Keep projection independent from Binding occurrence selection and resolver
  cardinality.
- Treat `Some(undefined)` as a successful argless match.
- Preserve the negative declaration cases that prevent invocations, names, and
  unbranded functions from being accepted as Definitions.
