# Initial unified Block and direct Layer proof

This report preserves the initial failed prototype and its controls. Later work
fixed provider validation, the user accepted the measured Workspace compiler
adjustment, and the repository adopted the unified API. See the
[adoption report](adoption-20261104.md) and the
[current preview review](../preview-review-20261105.md) for that subsequent work.

## Decision at this checkpoint

Do not migrate the repository from this prototype. The requested authoring shape
works in focused consumers, but it fails the required compiler ceilings and one
source-level provider check. The current release candidate retains its verified
Block Definition and completion API. The separately completed `inMessageUpdate`
rename and composition parity remain in the candidate.

This is unfinished framework work, not an approved deferral. No budgets,
assertions, public contracts or registration checks were weakened to make the
prototype pass.

## What works

The ordinary prototype provides one `Block.make(...)` value with bound helpers,
portable Composition builders and `makeLayer(effect)` returning an ordinary
Effect Layer. It removes the public `.contract` projection from that value.
Layer construction acquires the graph without running init or starting Model
occurrences. Child providers compose with `Layer.provide`.

Program and Server accept the public Block together with its selected Layer.
Story and Scene acquire the selected executable in the test Scope. Private
implementation facts retain advanced test access to Commands, Subscriptions and
Mounts. Original handler providers remain deferred until Runtime handler
construction. Focused tests cover cleanup, selected handlers and identities.

The final ordinary build and strict TypeScript 6 source/emitted-path checks pass.
Fourteen runtime tests pass. Page hosting passed source checks; its runtime path
was not exercised by those tests. The ordinary proof did not complete the full
external packed/relocated matrix.

A separate family proof covers a Schema-specialized Query and fixed Single
Listbox/VirtualList factories. Seventeen tests and four source-free runtime cases
pass. Its split declarations pass strict TypeScript 6.0.3 checking without package
source trees. KeyedQuery, Combobox and the other factories were not migrated.

Generic handler selection retains the existing public refinement:
`const SelectedPosts = Posts.provideHandlers(handlers)`. This establishes exact
selected handler requirements before a parent authors its Binding. Arbitrary
later Layer provisioning cannot rewrite a contract already captured by that
Binding. Factory names such as `Listbox.makeBlock` remain unchanged.

## Required gates that fail

### Compiler cost

The measured fixtures keep their graph shape, domain and handler bodies,
operations, Mounts, Services and existing assertions. Only contracts and assembly
syntax change. The original fixtures and ceilings stay untouched.

| Workload    | Direct Layer instantiations / Types |   Unchanged ceiling |
| ----------- | ----------------------------------: | ------------------: |
| Deep 8      |                 3,053,157 / 424,199 |  1,152,618 / 55,843 |
| Wide 100    |                 5,337,430 / 442,595 | 3,132,298 / 216,662 |
| Workspace 4 |              10,685,646 / 1,196,822 | 2,642,699 / 229,173 |
| Workspace 8 |              12,048,102 / 1,028,932 | 4,515,010 / 299,721 |

These are compiler counts, not editor latency or rendering measurements. The
prototype also fails two of the seven original, unmodified workloads. That does
not describe the active candidate, which passes all seven.

The matched deep graph using the prior contract/constructor API costs
1,835,462 instantiations and 251,776 Types. It also exceeds the original native
assembly ceiling. This comparison preserves the same explicit contracts and
constructor bodies; the copied declaration restores the prior constructor's
original return facts. The full native-to-prototype increase therefore cannot
be attributed to returning an ordinary Layer alone.

The bounded controls did not resolve the cost:

- Removing the measurement-only facts import leaves the deep count unchanged.
- Passing compact child contracts instead of their authoring helpers increases
  the count slightly.
- Naming the Layer return interface saves only 2,809 instantiations and adds
  90 Types. It remains far above the ceiling.

The [performance results](./performance-results.json) preserve exact counts,
tool versions, source hashes, assertion counts and control receipts. They cover
the frozen performance snapshot, which predates the final page-host overloads;
no later compiler pass is implied.

### Selected provider validation

Two handler selections of the same Query can have different Service contracts.
Pairing the public selection from one with the other's Layer is currently
accepted by TypeScript. The root requirement projection then describes the wrong
selection. Runtime safely rejects the pairing because its original private
Result Service is missing; it never constructs a default implementation as a
fallback. Source rejection remains required.

Filtering private facts by Block owner repairs the different-owner case. It
cannot distinguish these two selections of the same owner. A declared graph
check must also preserve legitimate pending-handler resolution and generic UI
refinements. That complete check has not been established.

## Recommended next change

Keep the current completion surface for this release candidate. Investigate the
type boundary for graph acquisition and implementation facts before another
migration attempt, using the retained deep graph as the first control. Preserve
the intended single Block value and direct Layer target while testing that
boundary. A replacement public implementation stage or extra application
annotations would add authoring cost without resolving the measured problem.

The next proof must reject mismatched selected contracts, fit the existing
ceilings and exercise page hosting at runtime before broad conversion. The
remaining factories and full source-free release matrix follow that proof.

## Reproduce the frozen work

The experiments use commit `a84a2b04b0e9a9613b9db603150fa271fb7dc27f`. They
predate the canonical `inMessageUpdate` migration, so their old input spelling is
preserved as experiment evidence. Do not apply these patches to the current
candidate or combine the two experiments in one tree.

Create a detached worktree at that commit, install its pinned dependencies, and
apply either `ordinary.patch` or `family.patch` from this directory. The ordinary
proof also uses `performance-tools.patch`. Both patch sets are independently
checked against their original base. The [manifest](./manifest.json) and
[family inventory](./family-manifest.json) record hashes and ownership.

For the ordinary proof, build `packages/foldkit`, then run these two Vitest files:

```sh
node node_modules/vitest/vitest.mjs run \
  src/experimental/contracted/directBlockLayer.test.ts \
  src/experimental/constructed/directLayerPrototype.test.ts
```

Run those commands from `packages/foldkit`. From the worktree root, the retained
performance driver copies the package and fixtures before measuring:

```sh
NODE_DISABLE_COMPILE_CACHE=1 node internal/direct-block-performance/verify.mjs
```

A nonzero checker result is expected for the failed ceilings. The driver records
source diagnostics separately from valid measurements. Its README describes
the AST-preservation checks and the independent constructor, compact Binding and
named-interface controls.

For the family proof, use the focused `tsconfig.family-prototype.json` configs in
the core and UI packages. Build with the UI's
`tsconfig.family-prototype.build.json`, and emit the split consumer through
`consumer/family/tsconfig.emit.json`. Focused runtime files are
`familyLayer.test.ts`, `family.test.ts`, `familyRootProjection.test.ts` and
`fixedFamilyLayer.test.ts`. The root projection config intentionally demonstrates
the older snapshot's different-owner type failure. Its runtime tests remain
valid; the separate ordinary proof contains the later owner filter.

No release workflow or source-review transfer is part of these commands.
