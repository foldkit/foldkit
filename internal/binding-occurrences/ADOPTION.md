# Child Instance adoption

## Selected API

The user approved the explicit Binding API from the [runnable proof](README.md).
This work adds `ChildBlock.Instance` and `Binding.create({ key, args })` to the
current contract/Layer architecture. It does not adopt the separate unfinished
single-Block/direct-Layer completion prototype.

The public form stays explicit:

```ts
const Model = Schema.Struct({
  counters: Schema.Array(CounterBlock.Instance),
  nextCounterId: Schema.Number,
})
type Model = typeof Model.Type

const CountersBinding = ApplicationDefinition.makeBinding(CounterBlock, {
  field: 'counters',
  key: 'key',
  childField: 'model',
})

const addCounter = makeFieldsStep(model => ({
  counters: Array.append(
    CountersBinding.create({
      key: `counter-${model.nextCounterId}`,
      args: [],
    }),
  ),
  nextCounterId: Number.increment,
}))
```

`create` records a deferred write. The registered graph initializes the child
before the next Step and retains its init Commands. The Model contains only
ready `{ key, model }` Instances. Constructors, providers, lifecycle owners,
and view embedding retain their existing roles.

Creation-bearing field Steps return connected recipes. Plain field changes
remain Model-only, including generic field values whose Schema is selected by
a consumer. The existing generic `makeStep.fromMessage` declaration fixture
protects that distinction.

## Consumer and guidance adoption

The [inventory](adoption-inventory.md) covers all 35 examples, Website, Typing
Game, libraries and scaffolds. Counters is the matching application: its wrapper
contained only identity and the child Model. It now reuses `addCounter` during
startup and update. All existing behavior cases remain in its Story/Scene suites.

Other consumers retain their current storage deliberately. Job Application
entries already own domain IDs, Workspace retains child Models in maps, Typing
Game has a keyed optional Room, and Toast wrappers carry additional metadata.
No standard wrapper is added to those Models just to use the new API.

Canonical guidance, the scaffold FOLDKIT.md, shipped skills, active Website
pages, and two checked source snippets explain ready-only Models, deferred
initialization, init Commands, duplicate-key rejection and occurrence cleanup.
Published historical posts remain unchanged. No derived guidance generator
applies to these hand-authored sources.

Generic family `members` now reserve `Instance`. Source and runtime checks
reject attempts to overwrite the declared Schema; a conflicting custom member
must be renamed. The changeset and upgrade guide describe this breaking case.
The existing custom child operation `create` remains valid for other storage.

## Normal verification gates

The former isolated runtime consumer now lives in
`packages/foldkit/src/test/apps/childInstances`. It includes split-file parent
and child authoring, same-update operations, init Commands, OutMessages,
InMessages, dispatch context, two independent fields and generic families.

`packages/foldkit/scripts/check-child-instances.ts` is part of the normal
`check:emitted-declarations` command. It checks the public source surface, a
source-free built package, emitted application declarations and relocated
consumers with `skipLibCheck: false`. Positive and rejected cases are verified
with TypeScript 7.1.0-beta and 6.0.3. Removing rejection directives must produce
real type errors. Failed runs retain their temporary evidence; successful runs
remove it.

The focused runtime set passes **86 tests in 14 files**. Its mutation controls
cover lost init Commands, ordinary arrays being mistaken for Instances,
duplicate keys, wrong-field routing, missing family providers and the reserved
`Instance` member. Each mutation is restored before final verification.

The full core public declaration gate passes, including source acceptance and
rejection, relocated consumers, compiler diagnostics and editor completion
checks. The new child Instance checker passes all five phases with TypeScript
7.1.0-beta and 6.0.3. The existing generic Message-only Step source fixture passes
without consumer edits. Script source checks also pass.

The actual Counters project also emits without annotations. Its child's unique
key is reachable through the feature's type-only barrel, following the existing
public-contract convention. The root declaration command now runs
`scripts/check-counters-declarations.ts` to protect this real consumer. Removing
that key exposure makes the check fail with TS2527; restoring it passes.

Whole-project emission and strict source-free consumers pass for Workspace,
Job Application and Website in
`internal/layered-constructor/app-declarations/verification/run-tvlzsy`, with
zero original app/framework files read by the consumers. Their copied precision
controls fail as intended. Strict packed SSR consumers also pass in Chromium,
Firefox and WebKit after building the complete published package set.

Compiler workloads and budgets remain unchanged:

| Workload                 | Instantiations / ceiling |   Types / ceiling |
| ------------------------ | -----------------------: | ----------------: |
| Deep 8                   |      659,031 / 1,152,618 |   52,673 / 55,843 |
| Wide 100                 |    1,392,425 / 3,132,298 |  80,575 / 216,662 |
| Command requirements 200 |      340,252 / 2,659,415 |  63,182 / 389,460 |
| Subscriptions 100        |        548,577 / 548,740 |   24,507 / 24,583 |
| Workspace 4              |    2,561,447 / 2,642,699 | 210,175 / 229,173 |
| Workspace 8              |    4,330,299 / 4,515,010 | 283,972 / 299,721 |
| Machine search           |          70,759 / 83,700 |   13,405 / 18,800 |

The ordinary-result check uses its structural mapped contract directly in
`FieldStepReturn`. Referring to the equivalent imported `FieldTransforms` alias
increased Workspace 4 to 2,685,062 instantiations and 234,524 Types. The final
representation preserves that check and passes the unchanged ceilings. It does
not relax creation evidence or generic field validation.

Integration additionally requires the repository's mandatory pre-push hook and
independent review of the exact committed diff. Neither replaces the remaining
release sign-off and publication approval.

## Fresh feedback

The [November 3 refresh](feedback-refresh-20261103.md) reads issue/PR bodies,
conversation replies and review threads. It found no new preview discussion
reply. The new #1879 SSR build-watch report has a bounded repair: unsupported
SSR watch fails during configuration with the documented development/rebuild
alternatives. Client-only watch remains supported. All 88 build tests pass;
removing the guard makes the six refusal cases fail.

A later reply on #1752 confirms the installed-package development build-ID
cache issue. The candidate adapts that contribution: cached dependency code
imports a virtual module that revalidates the running server's ID. Production
IDs remain literal. Installed-package restart, ETag, source-map and production
graph checks pass, including mutation controls. The feedback report records the
contributor, source head and exact verification.

The #1650 embedded-hydration contribution still needs its own general review.
Older unimplemented proposals retain their recorded dispositions. This is not
a claim that every repository issue has been implemented or approved deferred.

## Release state

The implementation was prepared in an isolated worktree, preserving concurrent
checkouts. Integration follows exact-commit review and the mandatory hook.
Publication and Daybreak transfer/review are on hold. Final release sign-off
still requires a new feedback check and the remaining release gates, including
the separate unresolved Block completion proof. The earlier Lustre results do
not measure this addition's rendering cost; no new rendering result is claimed.

The local Website dev server generated API documentation without errors.
Interactive desktop inspection was attempted through the browser tool but
blocked by the locked Mac and browser attachment timeouts; no visual pass is
claimed. Website build and browser gates remain part of normal pre-push checks.
