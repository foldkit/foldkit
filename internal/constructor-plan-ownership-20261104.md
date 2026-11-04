# Checked constructor plan ownership

## Scope

Checked Block completion rejects update and view plans with owners or registered
graphs incompatible with init. The current API already rejects these plans at
construction time. The repair catches statically distinguishable mismatches
before acquisition, even when the decoded Model, Message, and result channels
match.

This repairs the canonical API at `c55fb523ec8537d940f39f6b53204d1b29f12da3`.
It does not adopt the isolated unified Block/direct Layer API.

## Implementation

The private Source validator pairs each constructor alternative's init Source
with that alternative's update and optional view Source. Distributing before
field projection retains valid conditional constructors and rejects crossed
branches. An absent view introduces no extra requirement. Erased `any` and
`unknown` Sources cannot authenticate a plan.

Field lowering distributes over constructor alternatives while explicitly
retaining required `children`, `init`, and `update` fields. Operation projection
uses the complete Body union. Validation runs after inference; generic Query and
KeyedQuery implementations retain their existing contracts.

The validator lives in its own internal module. Putting the same validator in
the larger authoring module raised the unchanged Machine fixture from 70,759
instantiations and 13,405 Types to 100,507 and 22,715. The private module restores
the original counts without changing compiler flags, fixtures, budgets, or the
validation rules. These are compiler counts, not editor latency measurements.

## Verification

- Framework build and complete native source checking pass.
- The normal emitted-declaration checker passes its complete source, external
  emission, rejected wiring, relocation, completion, documentation, and
  diagnostic checks. The constructor ownership fixtures are registered in
  that checker.
- Strict TypeScript 6.0.3 source and independently relocated emitted consumers
  pass with `skipLibCheck: false`, exact optional properties, and unchecked
  indexed access enabled. The relocated consumer reads no framework source.
- Valid fixtures cover ordinary, viewless, conditional, generic, and contextual
  constructors. They retain constructor Services and errors, optional/default/rest
  dispatch context, and direct and curried plan application.
- Invalid fixtures cover foreign owners, different registered Mount graphs,
  independently incompatible view Sources, erased Sources, and crossed
  conditional branches.
- Removing the update check, removing the view check, and losing union
  correlation cause 4, 3, and 1 unused rejection assertions respectively. Both
  source and copied emitted-declaration controls fail; exact restoration passes.
- Five existing construction, view, and input-update suites pass all 31 tests.

All seven original compiler fixtures pass unchanged:

| Fixture                  | Instantiations |   Types |
| ------------------------ | -------------: | ------: |
| Deep composition 8       |        659,031 |  52,673 |
| Wide composition 100     |      1,392,425 |  80,575 |
| Command requirements 200 |        340,252 |  63,182 |
| Wide Subscriptions 100   |        548,577 |  24,507 |
| Workspace 4              |      2,561,447 | 210,175 |
| Workspace 8              |      4,317,526 | 281,311 |
| Machine Search           |         70,759 |  13,405 |

The package commands reproduce the permanent gates after building Foldkit:

```sh
pnpm --filter foldkit check:emitted-declarations
pnpm --filter foldkit check:block-type-performance
```

The focused direct-source config is
`packages/foldkit/declaration-tests/tsconfig.constructor-plan-ownership.source.json`.
The accepted, rejected, and consumer fixtures beside it also run through the
normal external declaration pipeline.

## Limits and release gates

TypeScript cannot distinguish two runtime Composition objects with identical
structural contracts and graph metadata. Original runtime identity checks
remain necessary. No runtime construction, initialization, or lifecycle behavior
changes in this repair.

Exact-commit independent review and the mandatory pre-push checks precede
integration. Publication requires separate user approval. Daybreak source
transfer and review remain on hold.
