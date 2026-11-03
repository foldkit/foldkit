# Layer-owned authoring adoption

## Readiness requirements

Repository adoption follows the constructor and independent-contract proof. The
scope is 108 production completion sites across examples, UI, Website, Typing
Game, Query/KeyedQuery, scaffolds, and DevTools, plus their tests and active
guidance. Historical release content and compiler controls are preserved.

Before migration, the selected API must support:

- Private descendant resources with two direct and keyed occurrences.
- Exact generic input and view contracts, including callbacks without Schemas.
- Direct constructors and positional/default/contextual operation producers.
- Repeated generic factories, local display ids, and module reevaluation.
- Message-free leaves, routed-only parents, and lazy host-owned handler recipes.
- Public synchronous Steps and ordinary scoped Story/Scene tests.

No cast, `Unknown` Schema, or narrowed test scope substitutes for those cases.

## Current implementation

The readiness decision and supporting evidence are in
[READINESS.md](READINESS.md). Generic handler channel contracts and shared-owner
library factories passed their bounded proofs, and production adoption is now
implemented. [Adoption status](ADOPTION.md) records the final checks and review.

The independent contract prototype now accepts nonserialized input declarations
through `makeInputContract`. Model, Message, and OutMessage use Schemas. Its view,
init, and Context producers retain exact callback and generic input types.
Operation declarations accept existing Message tuple producers as well as direct
Message constructors; the original native completion validation applies.

Source and runtime coverage lives in
`contract-provisioning-proof/src/input-contracts.ts` and its focused test. The
earlier contract consumer and rejected channel-loss cases stay in the verifier.

Private resources now use an authenticated Runtime execution capability.
Ordinary declarations use an exported unique Symbol key whose identity reaches
authoring Owners as well as provider facts. Message-free contracts opt into an
exact empty dispatch declaration. These changes are verified in the current
package. Generic UI and Query implementations use the checked family mechanism
through the canonical Block surface.

## Resource declaration alternatives

Deriving contracts from a static Composition can expose exact descendant
resource scopes and codec requirements without a second Binding inventory.
However, requiring that Composition before completion conflicts with moving a
complete Binding/Composition expression into the executable constructor.

An owner-scoped Runtime capability can preserve that portability and hide
private resource identities. It must be installed by the actual Runtime with
the selected occurrence's refs and lifetime. The facade's EffectsLayer and
Commands must require it. Removing resource requirements without that provider
would accept execution that fails at Runtime.

The bounded Runtime proof checks two occurrences sharing a MemoMap, actual
Command invocation, stale/wrong authority rejection, constructor cleanup, and
pure tests without handler Service mocks. Existing native adapters retain their
explicit resource requirements until the new closure has been established.

## Identity alternatives

Readable ids name graph nodes. They cannot also provide generative type identity
for arbitrary repeated definitions. A nominal module key can distinguish two
roots named `Application`; a shared universal implementation family can support
generic UI specializations. Both need source, emitted, and Runtime proof.

A global duplicate-readable-id guard is not the adoption policy. Replacing it
with untyped random keys would make different providers look interchangeable
to TypeScript and is also insufficient.

## Migration order after readiness

1. Query and UI foundations, including Animation and generic selection Blocks.
2. Complete Workspace and Job Application consumers.
3. Other examples, DevTools, Website, and Typing Game.
4. Story/Scene consumers, declaration fixtures, lint recognition, and docs.
5. Scaffold source templates and generated artifacts, then packed consumers.

Changes to the architectural requirements are reviewed explicitly; the migration
does not silently sacrifice portable builders to remove an implementation gap.
InMessages follows as separate work.
