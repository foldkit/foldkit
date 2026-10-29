# Blocks + Effect Layers stabilization readiness

Read-only assessment of implementation checkpoint
`8b4180822316edd736809ab65136c850be488281`, followed by two targeted active
documentation repairs. This is a preparation plan, not a new verification or
publication result. The parent release lead owns final source identity, live
feedback reconciliation, execution and the release recommendation.

## Release boundary and delta

The current published preview is `f3be22cfeefed437164ad614d08b16d9000e0703`.
[Its publication report](preview-publication-20261026.md) verifies all nine
registry packages, the immutable Website and actual Coverchart at
`677b804e9aa0d0d1f636067079ae404ead84115a`. Earlier preparation reports retain
their own source pins; their old pending holds and consumer baselines do not
describe the current published state.

The post-publication public changes are:

- `Definition.makeMapBinding(ChildBlock, config)` replaces the standalone
  `makeMapBinding(ParentDefinition, ChildBlock, config)`. The standalone subpath
  is removed. Destructured feature helpers keep parent ownership and inference.
- `makeInitIfMissingStep` from `foldkit/bindingInit` preserves existing direct
  Record/HashMap children or inserts an initialized child with its Commands.
  Both paths require the registered Binding. Wrapped/custom storage remains
  explicit; this does not broaden the helper to every child field shape.
- `Route.parsePathWithFallback` accepts origin-relative paths with the ordinary
  parser/query/fallback contracts. This is optional; existing Routes do not
  require migration.

Workspace factoring, optimistic projections, naming, retained-state organization
and visual repairs exercise the framework without adding another public API.
The record-only update, focused Step callback APIs, checked Block assembly and
ManagedResource registry aggregation already exist in f3be. Do not announce
them again as new stabilization migrations.

## Documentation repairs

- Add an installed-f3be row and focused upgrade section to
  `packages/website/src/page/previewUpgrade.md`. It points to the existing map
  migration, preserves the current architecture and distinguishes optional
  retention/path helpers. It does not invent a target version or deployment.
- Correct `.changeset/clear-map-binding-documentation.md`, which still described
  documentation for a retained standalone function. It now describes the
  Definition method and extracted-helper hovers.

Both files pass focused Oxfmt formatting/checking and `git diff --check`.
Historical migration examples and reports remain unchanged.

The [map-method adoption report](map-binding-method-adoption-20261027.md) records
a deliberate compiler-ceiling revision. Workspace four-group ceilings change
from 2,639,574 instantiations / 206,314 Types to 2,642,699 / 229,173. Five other
ceilings and every fixture remain unchanged. The final stabilization summary
must not call this an unchanged-budget pass. Earlier pin-scoped reports remain
accurate historical evidence.

## Proportional final gates

Run from a frozen, reviewed final commit. Finish build/checker jobs before timed
editor or browser runs; preserve existing user servers. Package builds precede
consumers that resolve built entries.

1. Build the public packages and Typing Game shared prerequisite:
   `pnpm build:packages` and `pnpm --filter @typing-game/shared build`.
2. Run the full core and UI source/emitted-declaration harnesses through
   `pnpm check:emitted-declarations`, plus `pnpm --filter foldkit typecheck` and
   the affected Workspace, Website and Typing Game source configurations.
   The core command includes the separate route-Step/Program and route-path
   source configurations. Run the unchanged fixture sources with the reviewed
   current ceilings using `pnpm check:block-type-performance`.
3. Run core runtime/coverage, UI, lint-plugin and Workspace tests. The root
   scripts expose `pnpm --filter foldkit test`, `pnpm --filter @foldkit/ui test`
   and package-local Vitest. Website source/snippet checking, production build
   and tests verify the active migration guide against generated documentation.
   Use existing focused lifetime/registration/initialization suites to diagnose
   failures; passing broad CI alone does not establish a specific contract.
4. Run current lint, formatting and release metadata gates. Existing root
   scripts include `lint:ci`, `check:peer-floors`, `check:changeset-ignore`,
   `check:changeset-unwrapped`, `check:ui-subpath-exports`,
   `check:effect-prebundle`, `typecheck:scripts` and `test:scripts`.
   This checkout's missing origin requires a transparent pinned-main equivalent
   for scripts whose only obstacle is the reference, never a fabricated pass.
5. Emit the ordinary Workspace root and strictly relocate its declarations.
   The prior reusable checker is
   `/private/tmp/foldkit-next-preview-signoff-final-20261026/verify-workspace-declarations.py`.
   Its old fixture/source paths need a fresh directory and a review against
   current root contracts. No annotation inventory or relaxed compiler option
   should replace the ordinary consumer root merely to pass this gate.
6. Build and pack all nine packages into a fresh local rehearsal, exercise
   installed Coverchart and SPA/SSG/SSR, and verify current contracts and browser
   workflows. Local tarballs are preparation evidence; registry/deployment
   acceptance remains a separate post-approval stage.

The lead may reuse a prior gate only after a concrete source/dependency or
artifact identity comparison establishes its exact scope. Changed Framework,
lint, CLI and app inputs require their affected fresh gates.

## Prepared nine-package rehearsal

Fresh input directory:
`/private/tmp/foldkit-stabilization-rehearsal-20261027`.
Its README contains the exact staged command sequence and retained controls.
INPUT-ORIGINS.json records reused input provenance; PREPARED-INPUTS.json hashes
56 prepared inputs. No source snapshots, artifacts, results, builds,
installations, contract checks or browser runs were copied or executed.
All MJS and Python inputs pass syntax parsing only.

Adaptations from the October 26 Mount rehearsal:

- Fresh exact-commit/digest freeze and eight-library handshake remain required.
- Coverchart clones the actual current HEAD; obsolete pre-f3be migration
  patches are omitted. Its managed FOLDKIT.md is updated only in the clone.
  Actual HEAD, status and tracked hashes must remain identical.
- The nine initialization-family source, rejection and consumer fixtures are
  copied verbatim from current repository fixtures and must match the frozen
  source hashes before execution. Older dynamic-init runtime map calls use the
  Definition method; assertions remain present.
- Current route-path source/rejection/consumer fixtures and removed-map-subpath
  rejection are added. Accepted cases emit; strict relocated consumers reach
  declarations only, without repository source aliases.
- Runtime checks preserve existing five lifted-Command proofs and add passive
  retention, exact Model identity, absent Record/HashMap initialization and
  lifted Commands, path/query decoding and fallback checks.
- Negative controls require failure after removing a rejection directive and
  after supplying an absent key to the reuse identity scenario. Fixture bytes
  are restored and a clean pass is required. These check the proof harness;
  prior framework implementation mutations retain their separate scope.
- Existing Coverchart/scaffold/browser gates and the complete 32-case Workspace
  browser requirement remain. The summary now also requires the new installed
  stabilization contract result.

Retained fixture-only controls: pnpm 11.8.0, official library TypeScript
7.1.0-beta, CLI TypeScript 7.0.2, Playwright 1.63.0, frozen-lock scaffold
overrides for Hono 4.13.11, ip-address 10.7.2 and magic-string 1.4.2, and the
exact unpublished SSG UI metadata transport where needed. The package-age
policy remains enabled. These controls must stay out of public setup guidance.

## Performance reuse

Native driver:
`node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 1`.
Use the same driver for three alternating paired fresh-server runs per side;
the `all` scenario adds Website hover/completion/definition and error/clear
workflows. Default timeouts and validation stay unchanged. The Workspace probe
is inserted in memory and supports the current init-helper factoring.
The larger map workload reproducer and its strict declaration consumer are in
`internal/map-binding-method-adoption-20261027/README.md`.

Compare the latest candidate with the published f3be cohort under matched tools.
Workspace application factoring differs substantially, so its results describe
the changed application and must not be attributed entirely to Framework typing.
Keep post-edit hover/completion, completed-Block completion, error appearance
and clearing, sampled RSS and cold root costs distinct. Previous native results
are not tsrs measurements or long-session memory guarantees.

Runtime driver inputs:
`/private/tmp/foldkit-next-preview-signoff-final-20261026/lustre/driver`.
Canonical harness:
`/private/tmp/foldkit-preview-runtime-harness-20261023`.
The old prepare/time scripts retain hardcoded source pins, output paths and
slots. Adapt those in a new evidence directory. Build fresh naive/optimized
bundles for current candidate, published f3be and pinned main, recording source,
tool and bundle hashes. Run correctness via driver/verify.mjs before rotating
paired timing via driver/run.mjs. Six rotating rounds over six slots preserve
the established 36-sample method. Do not pool old absolute timings with fresh
runs or rerun profilers before a regression warrants attribution.

The older 12.7% optimized improvement and remaining 20–22% main gap retain their
fa96 source pin. They are not current-candidate measurements.

## Independent and Daybreak review

Freeze and independently review the exact published-f3be-to-final delta and
the final preparation repairs. The source manifest, literal symlink targets,
commit/tree and review delta must remain fixed through review.

Prior invocation templates are retained at
`/private/tmp/foldkit-final-security-20261026/run-daybreak.py` and
`/private/tmp/foldkit-mount-final-security-20261026/run-daybreak.py`.
They use `codex exec -m gpt-daybreak-blue-latest -s read-only` with
`model_reasoning_effort="high"` and `--cyber-access-program daybreak_blue`.
Prepare a new directory, prompt and frozen target instead of editing/reusing
old verdict files. The older wrappers assert that both SHAs are public;
unpublished local commits must not be substituted with an older public SHA or
described as publicly verified. Observe the security tool's current access
requirements while retaining the publication hold.

Refresh dependency evidence if required by the final scope; inherited findings
and reachability dispositions must remain visible. A static exact-delta review
does not create a clean dependency audit or extend an old Daybreak verdict.

## Publication hold

The user authorized stabilization preparation and expects one or two further
previews after it depending on feedback. No merge to main is authorized here.
Pushing `codex/layers-and-submodels` triggers canary publication, so it remains
the release boundary requiring the user's approval. Preserve PR #1655's
currently verified Ready snapshot until the replacement package cohort and
matching immutable deployment pass their own gates. Generate its three starting
points and prompts from the new verified manifest only after publication.

General UI selection contracts (#1809), Query enhancements and speculative
plugin APIs remain outside this Blocks + Effect Layers stabilization scope.
