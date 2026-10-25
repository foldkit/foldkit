# Final preview followups

## Scope and release boundary

This delta follows the verified `679d2d5e7f` candidate on `codex/workspace-example`.
It closes the four subsequent testing and storage assessments. The published
Ready snapshot remains `1f6776fa7ece`; publication and preview-branch integration
remain held for the user's approval. Main is unchanged.

## Consumer changes

| Followup                       | Outcome                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Headless child Messages, #1760 | Add optional `toParentMessage` from `foldkit/test`. Actual Binding metadata supplies the exact generated envelope without unrelated view inputs.                                  |
| Concurrent Story Messages      | `Story.message` retains pending Commands, appends new Commands and leaves resolution explicit. Final completeness and ambiguity checks remain. Scene is unchanged.                |
| Extracted emitting Steps       | Retain the operation-derived input `Parameters<typeof operation>[0]`. Three bounded alternatives lost contextual typing or graph capability; no new authoring API was justified.  |
| Tagged-union child storage     | Add optional `makeVariantBinding` from `foldkit/variantBinding` for one complete tagged child Schema directly included in the parent Union. Migrate Auth's two eligible Bindings. |

[Headless contract and exceptions](test-parent-message-assessment.md),
[Story semantics and adoption](story-concurrency.md),
[extracted-input comparison](extracted-step-inference-assessment.md), and
[variant safety, scaling and maintenance costs](variant-binding-assessment.md)
record the complete decisions.

Parent Stories across examples, Typing Game and Website use actual Bindings and
explicit ancestor wrapping. Five UI white-box envelopes remain behind private
Bindings; no production surface was widened solely for those tests. Real
Workspace rollback/save Stories now deliver concurrent Messages while the
original Command remains pending. Direct pending-state fixtures remain where
that state or an unsolicited result is the subject.

The whole-variant helper retains native occurrence and registration machinery.
It does not cover nested or wrapped variants. TypeScript checks the exact
decoded member and tag; runtime additionally checks Schema object identity,
which structurally equal unbranded Schema types cannot establish.

## Verification checkpoint

The combined core external harness passes direct source checks, accepted and
rejected emission, strict source-free relocation, native completion and
compiler diagnostic assertions. Core runtime passes 3,720 tests with one
intentional skip and coverage gates. Website passes 1,485 tests; Auth passes
13; 13 completed affected example/Typing Game runs pass 223 focused tests.
The variant guide's actual registered init and child routing also pass a
focused runtime proof.

The 53-project sweep passed 52 configurations; its remaining core failure is
repaired and the fresh complete core source check passes. The failure exposed
an inherited explicit-erasure limit in a legacy Mount test. A small private
sequential check now prevents an `any` flag from masking direct registry
validation. The test retains an exact-registry positive, public broad-name
rejection, and direct erased-args rejection; emitted public controls also reject
invented arguments.

A name-preserving `LayeredMountDefinition` alias still widens args to `any`.
Generic Composition calls can infer a narrower branch and accept that annotated
union. This is documented explicitly. The direct internal guard is not a claim
that every generic call recovers contracts erased by an annotation. No runtime
or public API changed for this repair.

All five compiler ceilings pass unchanged. Deep, wide and Command fixture counts
remain identical. The private guard adds 222 instantiations / 36 Types in the
four-group Workspace fixture and 382 / 52 in the eight-group fixture, less than
0.01% of instantiations. The optional variant helper's isolated Auth comparison
adds 76,114 instantiations (6.3%) and 3,341 Types (2.0%). Its bounded four/eight-
variant comparison finds mostly fixed overhead, not arbitrary scaling proof.

Twenty-one unintended generated declaration sidecars were archived with hashes
and removed before the final source freeze. The complete post-clean core source
check passes without recreating them. The private guard's isolated mutation
fails its exact rejection directive with the old union predicate and passes
with the restored sequential check. [Cleanup manifest](/private/tmp/foldkit-followup-generated-sidecars-20261025/manifest.json).

Independent review passes the testing implementations, the extracted-input
decision, the exact variant source and declaration, and realistic consumer
organization. Temporary mutations demonstrated failure of pending-Command,
decoded-input, nested-options and configuration validation gates; exact source
was restored before successful reruns.

The Website build passes in 23.55 seconds. The new guide section and expanded
snippet were inspected at normal desktop width through its normal development
startup. Directly serving the unprerendered production shell is not valid
hydration evidence. Temporary review servers and tab were closed; the existing
Workspace servers were preserved. API generation has zero errors with retained
external/private-symbol warnings. An initial Website test attempt stalled in
unpinned `pnpm ls`; it is excluded. The pinned-pnpm rerun is the passing result.

## Frozen artifact and editor evidence

The approved 6,902-file source digest is
`d7d06ee6c4d7b9be56a1803985be01bce0ca58a9a6466266df72fee4d47866df`.
Internal Markdown evidence addenda after this freeze do not change packaged
implementation, declarations, consumers, snippets, skills or scaffold sources.
The final clean full declaration harness also passes after the sidecar cleanup
without recreating source-tree declarations.

Three fresh native Website runs measure post-edit Binding hover/completion at
239/227 ms and error appearance/clearing at 616/611 ms. Three Workspace runs
measure 278/271 ms Binding hover/completion, 790 ms completed-Block completion
and 206/183 ms diagnostics, with a sampled maximum of 578 MiB. A separate
bounded same-session cold-root comparison against exact `679d2d5e7f` measures
2.95 versus 2.92 seconds, with overlapping ranges and unchanged source/artifact
fingerprints. No material incremental regression or causal speedup is shown.
Cold root expansion and long-session stability remain explicit limitations.
[Methods, ranges and compiler counts](preview-framework-performance.md#october-25-testing-and-storage-followups).

The independent focused static security review finds no new blocker. Synthetic
test replay still cannot mint live occurrence authority; native Binding identity
and lifecycle checks remain. Existing dependency findings are unchanged; this is
not a new Daybreak run or clean audit.

All nine packages were freshly built and packed from the frozen snapshot with
coherent local `.d7d06ee6c4d7` versions. The isolated Coverchart migration passes
source, lint, all 40 tests and production build. Generated SPA, SSG and SSR
projects pass all 12 source/lint/test/build gates. Four installed contract tests
exercise concurrent Story delivery, decoded headless wrapping and the public
variant subpath. Package identities and internal dependency realpaths match the
one artifact set. This is local tarball acceptance, not registry acceptance.

The first offline install's metadata retries were resolved with network-enabled
installation. Two unused imports in injected rehearsal contracts initially
failed SPA lint; removing those imports from the isolated fixture only yields
the passing rerun. Frozen framework/template sources were unchanged. No fresh
browser claim is made for this final test/helper delta; the prior browser
checkpoint retains its own scope.

The exact nine artifact hashes, installed provenance and gate logs are in
`/private/tmp/foldkit-testing-followups-rehearsal-20261025/rehearsal-summary.json`.

## Remaining final gates

Complete exact committed review before the authorized development-branch push.
None of these preparation gates authorizes release integration or publication.
