# Next preview approval summary

## Preparation status

The accumulated candidate is being checked on `codex/workspace-example`.
Publication remains held for user approval. Published Ready stays
`1f6776fa7ececa766188df5201eefec6ba781b5d`; integration and main are unchanged.
This report will identify the final verified source and local artifacts before
sign-off. Local tarballs are not public installation instructions.

## Changes from the published preview

### Required API migrations

- Use exhaustive records with `Composition.makeUpdate`, retaining `.withContext`.
- Pass producers to `makeCommandsStep` and `makeOutMessageStep`; all three focused
  helpers support Model-aware callbacks and payload-only `.fromMessage`.
- Reserve `layer` in ManagedResource registries. Fully attached registries expose
  `managedResources.layer`; mixed/host-owned entries retain explicit providers.
- Handle the new keyboard DragAndDrop facts and echo invocation generations in
  custom keyboard-result delivery. Use selected own fields for keyed Command
  cancellation.
- Preserve connected result channels and OutMessages at composition boundaries;
  the stricter checks reject the demonstrated losses rather than deferring them
  to Runtime errors.

The checked `prepareBlock`/`Block.assemble` boundary, Definition `make*` factory
names and `Program.make` already exist in the published preview.

### Conveniences, behavior and organization

- Optional Schema-derived Record/HashMap and whole-variant Bindings.
- Optional `foldkit/bindingInit` set/append/insert helpers for proven storage
  shapes, preserving explicit initialization for parent metadata and mixed work.
- Public test helpers for child facts, Command args and concurrent delivery.
- Nested Date/DateTime/TimeZone ViewInputs, reciprocal Binding inference and
  connected output contracts receive source and declaration fixes.
- Workspace exercises retained per-entity state, optimistic Board moves,
  notifications, ordinary routes/search parameters, Foldkit UI controls and
  coherent Story/Scene coverage.
- Feature-local helper imports reduce qualification. Named transition Step values
  and purposeful Step-producing functions end in `Step`; public operation keys,
  ordinary handlers, folds and applied results retain their distinct roles.
- Optional tsrs editor guidance recommends a tested responsiveness option while
  official TypeScript remains the repository/CI checking contract.

## Final verification

Final coherent source, package/consumer results and benchmark measurements are
pending completion of the naming migration. Earlier checkpoint evidence remains
scoped to its recorded source; it is not silently promoted to this candidate.

## Feedback and security

The October 26 UTC read-only feedback check found no new replies after October 25,
18:00 UTC on the performance-help issue or preview PR. Recent unrelated feature
and fork-migration PR updates remain outside this release.

A refreshed dependency audit reports the same advisory contracts as the reviewed
checkpoint: 1 Critical, 8 High, 11 Moderate and 4 Low. Existing reachability
limitations and maintenance followups remain. This is not a clean audit or a new
Daybreak review. No new dependency is introduced by the naming work.

## After approval

Integrate only into `codex/layers-and-submodels`, verify the published packages
and immutable documentation deployment, then generate the three PR starting paths
from that manifest: stable migration, previous-preview upgrade and new project.
Keep the previous Ready instructions until the replacement passes those gates.
Update actual Coverchart against the verified published package set afterward.
