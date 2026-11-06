# Next preview review

The comparison is the last published preview,
`90746b32d2ca8bc0476de7a051ace396ca590ae0`. The candidate uses one passive
Block declaration and an ordinary implementation Layer, with portable typed
builders and explicit Bindings. The rejected constructor-local Binding
experiment is not included. User working-directory edits and comments are
preserved.

## Changes since the published preview

- **Block construction.** Declare `FooBlock = Block.make(...)` once, author
  through its helpers and Composition, then export `layer = FooBlock.makeLayer(...)`.
  The constructor acquires explicit Bindings; ordinary Layers supply child
  implementations. Program, Server, Story and Scene receive the selected
  `{ block, layer }` pair. Application state and occurrence lifecycles stay
  Model-owned; request dependencies stay in handler constructors.
- **Parent inputs and update composition.** InMessages have their own checked
  update. Generated Binding methods produce connected parent Steps. Ordinary
  exhaustive handler records remain the default; focused updates can compose
  in order without losing Commands, requirements, OutMessages or the original
  dispatch Model.
- **Child creation and host-handler parity.** Standard child arrays can append passive
  `Binding.create({ key, args })` requests through a field Step, retaining child
  init Commands. The constructor/Layer API preserves the existing ability to
  leave selected handlers to the host, with exact identities, Service requirements
  and constructor errors.
- **Repository conventions.** Split features put their declaration/key/helpers
  in `block.ts`, relationships in `composition.ts`, construction in `layer.ts`,
  and a separate local handler bundle in `effectsLayer.ts`. Child folders live
  under `blocks/` with explicit public barrels. Binding names mirror their fields.
  Examples, Website, Typing Game, scaffolds, active snippets and skills agree.
- **Application testing.** Behavior tests use Story or Scene steps and the
  Block-aware Effect runners. The audit covers 167 test/support files. Meaningful
  Model identity and Command assertions are preserved; domain, routing, Service
  and timed benchmark tests keep their appropriate focused forms.
- **Effect boundaries.** Public ManagedResource requirement lists use
  `effects.managedResources`, `operations.<name>.managedResources` and
  `inMessageOutputs.<tag>.managedResources`. Old spellings are rejected in
  Source, emitted and erased runtime callers. Graph construction and handler
  Layers retain separate Service/error contracts.
- **Lifecycle and tooling repairs.** Removed occurrences cancel work and reject
  stale deliveries. SSR reloads retain consistent declarations; unsupported SSR
  build watch fails with a direct diagnostic. The main sync includes Effect and
  platform 4.1 with matching compatibility ranges. Relay discovery validates
  destinations before liveness probes, and HMR-disabled cleanup guidance
  explains when a process restart is required.
- **Incoming feedback.** Node cancels late unused response bodies. Empty and
  changing Menus avoid invalid active indexes. Pointer drag-and-drop reports
  positions after excluding the source, matching keyboard movement. Scene
  follows current Mount delivery boundaries, retires removed owners, and
  reacquires same-key replacements. Query has public Runtime lifetime coverage.

## API decisions

Failed Dialog opening now finishes native cleanup through the existing
`CloseDialog` Command before emitting `CompletedClose`. A conditional parent can
retain its child until that acknowledgement, including when opening or lifecycle
acquisition fails. `Closed` retains its existing timing. The three existing
OutMessages stay unchanged; the additional `FailedOpen` tag in the main-targeted
proposal is not adopted. The repair addresses the conditional-parent workflow
reported by [Awjin in #1892](https://github.com/foldkit/foldkit/pull/1892).

The proposed `makeStep<ChangedUrl>(...)` and
`makeStep.fromMessage<ChangedUrl>(...)` spellings did not preserve exact inferred
output channels. They are not added. An extracted producer keeps its precise
Message parameter annotation; inline handler records infer it. Ordinary handlers
can return complete results directly.

Local Schema codec Services infer automatically. Advanced `codec.decoding` and
`codec.encoding` bounds remain for requirements hidden by an opaque child's
complete dispatch Schema. The proof includes actual parent/DevTools decoder
provisioning. Normal Message serialization stays self-contained.

TypeScript 6 nameability is verified for extracted helpers and whole-app
declarations. Unique keys stay private where possible. Export the original key
declaration when checked emission needs it; public barrels can use a type-only
re-export when callers only need to name its identity.

Five UI entry points also expose type-only names for their original child keys,
so independently exported provider Layers emit portable declarations. All 17
ordinary UI provider modules pass independently on both compilers; the permanent
checker exercises the affected providers in separate compilation programs.
Runtime exports, identities and provider admission checks are unchanged.

## Verification

The [convention report](blocks-review-followups-20261104.md) records the preserved
edits, complete application audit, strict Source/emitted/relocated checks on both
compilers, six whole-app declaration emits, packed CLI and three-browser SSR
checks. The [feedback report](preview-feedback-integration-20261105.md) identifies
the original contribution heads, separate maintainer repairs and mutation controls.

Canonical typechecks and all eight current compiler ceilings pass after the
incoming integration. Two Workspace instantiation ceilings were explicitly
adjusted and accepted during unified Block adoption; this follow-up raises none.
See the [accepted compiler boundaries](block-api-simplification/adoption-20261104.md#compiler-boundaries).
Actual browser checks pass all 10 Kanban and 33 Workspace
cases. Website and UI Showcase Menu opening, disabled-item navigation and Escape
work; a private public-API fixture verifies empty opening, clearing while focused,
shortening below the active index and subsequent valid selection.

All 74 Dialog Story/runtime tests pass. They cover plain and animated conditional
parents, native cleanup before completion, and removal or replacement during
native close. Source-free parent Layer/Story consumers pass on both compilers.
Nine Dialog behavior and provider-name mutation controls fail at their intended
assertions before exact source is restored.

The final mandatory push hook and both PR and merge-queue workflows pass for
[integration #1894](https://github.com/foldkit/foldkit/pull/1894), merged as
`570ecedddaef638bb07fbaaf9abda2f905125548`. All ten example-browser shards pass
in both runs. The merged tree exactly matches the independently reviewed commit
`3117c8947db1190a850fdba72d0ed4cb7a4335ff`.
The coherent public-package build and a fresh installed packed-SSR consumer pass
at code commit `75a3990d55302c163a6d56282d43e33fc34a6a0b`, including Chromium,
Firefox and WebKit. Independent review approves that exact code commit.

## Review before publication

Publication is held for the user's approval. The earlier Daybreak review and
hardening follow-up cover their named commits, not these later changes. No new
private-source transfer is authorized.

The fresh quiet [Lustre comparison](block-api-simplification/rendering-20261105/README.md)
measures code commit `75a3990d55302c163a6d56282d43e33fc34a6a0b` against actual
main `a471adb24d750ab9e8d8312edad53ff6f26d961b`. Across eight cyclic rounds,
naive medians are 493.0/562.8 ms for main/candidate (**14.16% slower**), and
optimized medians are 221.4/274.8 ms (**24.12% slower**). All 32 samples and
four functional preflights are retained; evidence mutations verify the counter
and sample-count gates. Naive/optimized bundles add 44,093/44,713 gzip bytes.
The rendering and bundle gaps require explicit release review; compiler-budget
acceptance does not approve them. Differences from older batches do not isolate
the effect of any individual change.

Only #1662 and #1663 have explicit approval for post-main deferral. External
dispatch frames (#1871), a provided frame scheduler (#1872), and the bookmarked
Query factory rename are separate design work, not implemented features or
implied approved deferrals.
