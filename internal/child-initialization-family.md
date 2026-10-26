# Dynamic child initialization helpers

## Scope

This approved followup extends development checkpoint `732258ae40` on
`codex/workspace-example`. Publication remains held. Published Ready stays
`1f6776fa7ece`; this work does not update integration, main, npm, deployments or
actual Coverchart. The earlier [preparation report](preview-ready-20261025.md)
retains the nine-package rehearsal and its recorded source-alias qualification.

## Consumer API

The optional `foldkit/bindingInit` module now provides three storage operations:

| Helper          | Storage                                                                                                     | Existing occurrence    |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------- |
| `initAndSet`    | Required/optional direct child, exact key/child Option wrapper, or an existing singular accessor projection | Replaced               |
| `initAndAppend` | Keyed array already declaring `init.instances` and `init.toItem`                                            | Duplicate key rejected |
| `initAndInsert` | Direct child values in a `makeMapBinding` Record/HashMap                                                    | Duplicate key rejected |

For example, Room's Binding already declares its slot, key and child fields:

```ts
return initAndSet(RoomBinding, model, {
  key: roomId,
  args: [Option.some(roomId)],
})
```

The helper constructs the exact two-field wrapper. Direct fields and keyed
Options need no startup policy. Custom unkeyed accessors can reuse their existing
validated `init.toParentFields` projection. An accessor depending on a sibling
selector still needs an explicit writer when that selector also changes.

Each helper returns the native passive recipe. Composition later initializes the
child and retains its qualified Commands, Services and Binding registration.
Construction runs neither child init nor wrapper/projection callbacks. Ordinary
folds and operations remain membership-preserving. The parent owns presence
checks, removal and ordering.

Same-key reinitialization does not create a fresh generation or cancel pending
work. Replacing an Option's key follows ordinary occurrence removal and creation;
A → B → A retains stale-result isolation. A behavioral reset still belongs to a
child Message-backed operation.

Keep explicit `Binding.init` for extra parent-owned wrapper metadata, sibling
changes, parent Commands, custom storage without a projection, array/map
replacement, or whole tagged variants. Those cases need information the Binding
does not supply. No extra variant initializer is added: the native identity writer
is already concise, and Auth's switches append parent Commands.

### Adoption

- Website: Home, Playground and UI Pages replace their repeated singular writers.
- Typing Game: both Room creation paths use the keyed Option helper.
- Workspace and Job Application retain the six previously migrated array sites.
- Auth login/logout folds now return sibling Binding init recipes instead of
  projecting `ChildBlock.init(...).model`. Future child init Commands remain
  ahead of the existing explicit parent Commands. Plain Bindings are declared
  before reciprocal policies, avoiding an import cycle.
- Website source-tab transitions, parent-draft resets, Counters' ID updates,
  whole-variant startup and wrappers with extra metadata retain explicit writers.
- No production consumer currently creates mapped children. The public use case
  comes from #1706 and the first migration report; source/emitted fixtures and a
  fresh installed consumer exercise both map containers. The active guide has a
  focused insertion snippet. No example feature was invented just to use it.

The scaffold, active initialization/Block/upgrade guides, snippets, skills and
TSDoc describe the same choices. Browser review corrected the guide links to
`/core/init-and-flags#dynamic-storage-helpers` and confirmed the table and both
new snippets. Published historical content is preserved. The concurrent Workspace
default-filter annotation cleanup is included without changing its constructor.
The Website also includes the concurrent focused-helper imports and shared
Application transition type. Subscription providers use their registry Layers
directly, and `LoadPlayground` is declared with the other root Commands.

## Internal encoding and review

A private-symbol type witness retains only storage kind and literal field names.
It carries no Schema, callbacks, full Config or duplicate requirements graph.
Constructor and policy-selected results retain the witness; the internal interface
is publicly nameable for inferred declaration emission. Runtime storage remains
in validated metadata and resolves policy aliases to the original Binding.

One prototype attached another alias at every internal result. It exceeded the
deep fixture's Types ceiling: 72,708 versus 55,843. The retained constructor/policy
placement passes every unchanged ceiling and requires no new Binding factory.

Independent review caught a same-storage union hole: different child init
signatures could share the same placement and fields. All three helpers now
reject whole-Binding unions. `NoInfer` wraps the complete validation tuple, so it
does not suppress the validator's distributive union check. Five source/emitted
negative cases cover direct, optional keyed, projected, array and map forms.
Mutation controls reopen all five holes when the inference barrier moves inside.
Disabling map duplicate guards fails exactly the two duplicate-before-init tests.

The new helpers retain the runtime-accurate generated child Message channel.
An existing native keyed initializer's opaque recipe uses its authored parent
Message parameter instead; this pass does not claim whole-return type equality
with that existing signature. Model, qualified requirements and registration are
verified exactly against the native initializer, and actual generated delivery is
verified by executing child init Commands.

## Verification

All use package-local TypeScript **7.1.0-beta**:

- All 53 source configurations pass, with stable framework/artifact hashes.
  A final one-checker core pass also succeeds.
- Full core and UI emitted-declaration gates pass, including source rejection,
  external emission, strict relocation and native authoring checks. The new
  fixtures retain exact keys, optional/default/rest/generic arguments, Models,
  Messages, Commands, Services and graph requirements.
- Actual Workspace root emits **115 declarations / 13,222,848 bytes** and passes
  strict relocated consumption after the concurrent annotation cleanup.
- Core: **3,793 passed, one intentional skip**; coverage is 91.17% statements,
  85.34% branches, 89.58% functions and 91.43% lines.
- UI **1,301**, Website **1,492**, Workspace **153**, Typing Game **29**, Auth
  **13** tests pass. New focused runtime coverage comprises **40 tests** across
  singular, optional keyed and map initialization. The eight editor-driver tests
  pass, including erased/incorrect hover rejection.
- A fresh tarball installs offline into a separate consumer. Required set,
  keyed Option creation, append, Record insertion and HashMap insertion each
  retain a qualified init Command; all five Commands execute with the child
  Service and return the expected generated parent Message. Installed source
  and emitted fixtures resolve only the tarball's `dist` entries.

The later Website refactor passes its affected source check, all **1,492** tests
and focused application lint. Its separate editor comparison is recorded below;
the framework and other application source match the earlier verification input.

The tarball SHA-256 is
`fe03e7f274929f1e61e5325ec74cae549a18edcd67318dd719be844f824123ee`.
Installed and source `dist` contents match. This is local package acceptance,
not a registry/deployment check or a repeat of the earlier nine-package rehearsal.

The first Website test attempt hit the default package manager's blocked network
identity lookup. It is excluded; the final run uses cached pinned pnpm and passes
all tests. Browser guidance review uses a clean devserver after a development
hot-update duplicate-definition overlay; it does not establish HMR behavior.

## Compiler cost

All six original ceilings are unchanged:

| Fixture           | Instantiations |   Ceiling |   Types | Ceiling |
| ----------------- | -------------: | --------: | ------: | ------: |
| Deep 8            |        635,409 | 1,152,618 |  51,416 |  55,843 |
| Wide 100          |      1,331,305 | 3,132,298 |  80,466 | 216,662 |
| Commands 200      |        335,824 | 2,659,415 |  62,285 | 389,460 |
| Subscriptions 100 |        548,398 |   548,398 |  24,566 |  24,566 |
| Workspace 4       |      2,510,412 | 2,639,574 | 203,019 | 206,314 |
| Workspace 8       |      4,278,713 | 4,515,010 | 279,563 | 280,523 |

The common witness has a cost: isolated deep instantiations rise from 589,761 to
635,409, and wide instantiations from 1,151,007 to 1,331,305. Subscription counts
stay unchanged. W8 retains 960 Types of headroom; these helpers do not justify
raising that ceiling.

## Native editor comparison

The baseline is the current optimized `732258ae40` implementation, reproduced by
the verified `1b89a2325553` snapshot; it is not the historical slow baseline.
Baseline equivalence is recorded before this followup. Both labels use an
identical request driver and native TS7 version in alternating pairs.

Six strict paired Workspace runs retain every sample:

| Post-edit operation            | Baseline median | Candidate median |
| ------------------------------ | --------------: | ---------------: |
| Binding hover                  |          306 ms |           319 ms |
| Binding completion             |          321 ms |           309 ms |
| Completed Block completion     |           60 ms |            63 ms |
| Invalid-title error appearance |          228 ms |           283 ms |
| Error clearing                 |          219 ms |           212 ms |

Error appearance is slower in five of six pairs, with a median paired increase
of **43 ms**. This moderate signal remains in the assessment; the pass is not
performance-neutral. Candidate maxima are 417 ms for that error and 645 ms for
edited hover. Completion's initial slowdown does not reproduce. Sampled Workspace
memory medians do not increase.

Three strict paired Website runs overlap broadly. Changed-URL hover is 300→287 ms,
error appearance 760→728 ms and clearing 737→715 ms. Cold completed-root access
remains **3.83→3.24 seconds**, with a candidate maximum of 3.63 seconds. Variability
does not establish a general speedup. No Website RSS, long-session, tsrs or Neovim
UI claim is made.

The first benchmark attempt expected an obsolete outer hover alias. The driver
now accepts either precise display, requires Search's Schema fields independently
of visible ownership, and rejects the keyed/erased alternatives. Early failed or
less strict batches are excluded from the figures above. An extra three-pair
Workspace batch resolves the conflicting completion results; it remains included
rather than selecting the faster batch. Independent Astra review recommends
retaining the family with the diagnostic caveat.

Three additional alternating Website pairs compare that candidate with the
later Website refactor, using identical probes. Post-edit Changed-URL hover is
247→250 ms, error appearance 642→669 ms, and clearing 648→629 ms. Cold completed-root
access is 3.04→3.21 seconds; both ranges overlap (2.97–3.30 and 2.99–3.29 seconds).
These samples show no material additional responsiveness loss. They do not remove
the existing cold-root limitation or revise the helper-family comparison above.

## Evidence locations

Local evidence root: `/private/tmp/foldkit-initialization-family-20261026`.

- `verification/`: source, runtime/coverage, emitted, compiler, lint and driver logs.
- `installed-consumer/verification.md`: tarball, resolution and runtime contracts.
- `mutations/REPORT.md`: clean controls, exact mutations and expected failures.
- `native-verified/`: strict Website and first Workspace batch.
- `native-workspace-confirmation/`: second strict Workspace batch.
- `native-pooled-workspace.json`: all six Workspace samples and ranges.
- `native-concurrent-website/`: paired checks of the later Website refactor.
- `workspace-declarations/results.json`: actual application emission/relocation.
- `baseline-equivalence.json`: current optimized baseline equivalence.
- `post-measurement-equivalence.json`: later changes classified by source scope.

The measured candidate's source freeze is
`b421a74cf7a9dfd6caf746ff8b2ccf2927ad7e54bef98a7a43c166c9ac361428`.
Its profiling driver is overlaid identically on both snapshots and recorded in
native metadata. Later Website changes have a separate source freeze and paired
comparison; they are not attributed to the original benchmark candidate. The
framework, Workspace and built Foldkit package inputs match that candidate.
The later Website source freeze is
`1ba14fc1f28ce318b664def605fd812a442e09d3c5f62b56b57393931a694757`.
Exact commit review remains the gate before a development-branch push. Release integration,
published acceptance, Ready promotion and announcement remain held for approval.
