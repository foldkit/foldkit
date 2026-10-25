# Workspace root assembly cleanup

## Result

Workspace now uses the ordinary Website-style `block.ts`: a private `prepare`
function, `Composition.prepareBlock`, and the checked `FromAssemblyWithView`
export. The extra implementation interface, nested producer return annotation,
and `satisfies` inventory are removed. No framework API or implementation changed.

The existing `ApplicationBindings` tuple in `composition.ts` is now an exported
type. TypeScript can name it from another module as
`import('./composition').ApplicationBindings`, instead of serializing all nine
Bindings again inside the root producer. `block.ts` still exports only
`ApplicationBlock`; the tuple type is exported only from `composition.ts`.

The tuple remains an explicit declaration boundary. Its type and value must both
change when the graph changes. Ordinary inline Composition inference still
reaches TS7056 for this graph. This cleanup does not establish unlimited
declaration scaling or a universal editor-performance fix.

Standalone applications normally bundle JavaScript without publishing
declarations. Full-root emission remains a verification target here because
packaged Blocks and TypeScript project boundaries depend on portable
declarations. The passing gate still checks the actual root and all its
dependencies; it was not replaced by a smaller fixture.

## Verification

The control is `23f4bd93e5bc1314ecad8ff8898e9f9ee1e170c4` plus captured
Workspace readability edits and concurrent user refactors. Candidate code differs in exactly two files:
`block.ts` and the tuple type's export modifier in `composition.ts`. Foldkit and
UI source and built declarations are byte-identical to the control.

- Full Workspace source checking passes.
- Actual whole-root emission produces 110 declaration files, totaling
  12,420,362 bytes. The earlier explicit implementation header produced
  11,452,935 bytes. The simpler source therefore has larger emitted output.
- Strict relocated consumption passes using only those declarations with
  `skipLibCheck: false`.
- Wrong-view and missing-Binding mutations are rejected. The missing-Binding
  control removes the entry from both tuple inventories so it exercises init
  and update registration checks.
- Existing raw-source, external emitted and relocated record-update contracts
  pass, retaining exact contexts, per-Message channels and registration.
- Workspace's 160 tests pass. Application lint and formatting pass. Comparing
  emitted JavaScript syntax trees against the captured pre-cleanup control
  confirms that the assembly cleanup changes no runtime code; an in-memory
  literal mutation is detected by that comparison.
- All five compiler ceilings pass with exactly the prior counts. No ceiling or
  timeout changed.

The original private-tuple control fails TS7056 with the ordinary `block.ts`;
the exported-tuple candidate passes. This observes the declaration gate fail
before the one-line repair.

## Paired native editor measurements

Three alternating control/candidate pairs use the unchanged native LSP driver
and official TypeScript `7.1.0-beta`, Node `24.22.1`, fresh server sessions and
the existing 60-second request timeout. Both snapshots have local workspace
packages and identical external dependency realpaths. Workload hashes are
stable across all three runs for each snapshot. Completion checks require the
expected members, and the diagnostics workflow verifies the error and its
removal.

The completed-Block operation requests member completion after
`ApplicationBlock.` in Workspace's `entry.ts`. Post-edit measurements follow an
in-memory newline edit. They do not measure typing in `block.ts` or Neovim UI
rendering.

| Operation                             | Control median ms | Candidate median ms |
| ------------------------------------- | ----------------: | ------------------: |
| Binding hover after edit              |           311.089 |             288.631 |
| Binding completion after edit         |           348.794 |             293.049 |
| Completed Block completion, first     |         1,038.853 |             167.885 |
| Completed Block completion after edit |           840.428 |              57.357 |
| Error appearance                      |           226.909 |             221.422 |
| Error clearing                        |           197.492 |             195.513 |

The completed-Block post-edit ranges do not overlap: 824.205–862.518 ms for the
control and 50.997–77.133 ms for the candidate. That operation is approximately
14.7 times faster by the paired medians. Other workflows have overlapping
ranges; do not describe the whole application or framework as 14.7 times faster.

The maximum sampled server RSS across these bounded sessions is 600,560 KiB
for the control and 443,776 KiB for the candidate. Sampling runs every 250 ms,
so these observations do not establish a true peak or long-session memory
bound. The paired snapshots have identical Website source and framework
artifacts. Website editor measurements were not repeated in this batch;
earlier results retain their source scope. tsrs was not measured here.

## Rejected experiments

| Encoding                                                                        | Outcome                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Derive a private implementation interface from an inferred implementation value | Source passes; TS7056 moves to that value                            |
| Use overloaded `ReturnType` for the producer annotation                         | Selects a fallback `AssemblyDraft<never>` and fails source checking  |
| Name the update's dual call signatures                                          | Smaller update declaration; actual root still fails TS7056           |
| Wrap inferred completed contracts in named interfaces or outer drafts           | Build/source controls pass where applicable; actual root still fails |
| Normalize repeated parent contracts in Binding descriptors                      | Actual Composition still fails; checker work increases               |
| Export the existing exact Binding tuple type                                    | Actual ordinary root emits and relocates; retained                   |

No experimental framework descriptor, extra authoring phase or new factory is
integrated. An early suspicion about default `EffectsLayer` overloads was
withdrawn: unmodified source preserves the explicit Layer's exact Service
requirements. Return-marker mutations were not evidence of an existing bug.

## Evidence

- Baseline controls and dependency provenance:
  `/private/tmp/foldkit-workspace-portability-baseline-20261025`.
- Source, emission, rejection and strict relocation:
  `/private/tmp/foldkit-workspace-exported-tuple-proof-20261025` and the linked
  runner output under
  `/private/tmp/foldkit-workspace-update-verification-runner-20261025/runs/`.
- Paired snapshots, driver, raw reports, summary and unchanged compiler counts:
  `/private/tmp/foldkit-workspace-clean-assembly-20261025`.
- Rejected patches and logs:
  `/private/tmp/foldkit-workspace-block-dx-20261025`,
  `/private/tmp/foldkit-workspace-update-interface-20261025`,
  `/private/tmp/foldkit-workspace-outer-draft-20261025/outer-carrier-evidence`,
  `/private/tmp/foldkit-prepare-boundary-20261025/evidence` and
  `/private/tmp/foldkit-composition-serialization-20261025/evidence`.

Publication remains held for the user's approval.
