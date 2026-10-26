# Feature-local Step helpers

## Consumer convention

Split features export the Step helpers their implementation uses from their early
Definition module. Update and composition modules named-import those helpers.
Colocated features destructure privately beside the Definition. Keep qualification
when a module uses several Definitions and needs to distinguish their owners.
Feature barrels continue to expose completed Blocks rather than authoring tools.

This covers `makeStep`, `makeFieldsStep`, `makeCommandsStep`,
`makeOutMessageStep` and `makeNoopStep`. Their callback, `.fromMessage`, inferred
requirements and result contracts are unchanged. Other factories retain their
Definition qualifier. No framework API is added or removed.

## Adoption

The migration replaces 590 qualified Step-helper references: 436 in examples and
154 across Website and Typing Game. The example sweep covers 59 owners, with 44
split exported helper declarations and 15 private colocated declarations. Existing
module dependencies remain in place; no feature barrel or new module dependency
is introduced. Auth's existing split owner in `composition.ts` retains that file
rather than adding another Definition module.

Active complete snippets follow the same convention. Generic or multi-owner
examples keep useful qualifiers. Context-only fragments, public API signatures,
ownership-lint teaching examples, and accurately labelled before/bad examples
retain qualifications that explain their contracts. Published historical material
is preserved. Repository/scaffold instructions, generation/audit skills, project
organization guidance and the update guide describe the convention.

The lint rules now follow proven local and imported Step-helper ownership, so
changing the spelling does not remove child-state or child-Message checks. This
includes `.fromMessage`, renamed imports and immutable local aliases. Provenance
remains bounded; the plugin README records unsupported cross-module shapes and
the independent limitation on cross-file Composition registration.

## Verification

All 35 example source projects pass their package-local TypeScript 7.1.0-beta
checks. All 34 example projects with tests pass: 689 tests in 108 files. The SSG
example has no test script. Website and Typing Game source checks pass, with 1,492 and 29 passing tests
respectively. Website's production build passes. App lint and Effect lint pass
across examples, Website and Typing Game with the rebuilt plugin.

Plugin source and real-fixture typechecks pass, with 176 focused/relevant tests
and all 638 plugin tests passing. Disabling imported-helper provenance produced
three expected failures; restoring the earlier qualified-alias gap produced five
expected failures while wrong-owner controls remained green. The final repair
retains both protections. Aliased `.fromMessage` helpers also retain their
Message-only callback contract: a payload field overlapping a child field no
longer receives parent Model evidence. Disabling that adapter distinction fails
the direct and aliased payload controls; ordinary Model-aware alias enforcement
still passes.

The actual Workspace root emits 115 declaration files totaling 13,315,336 bytes.
A relocated consumer passes with `strict` and `skipLibCheck: false`, including
accepted/rejected Model, init tuple, direct/curried update, Message and Service
contracts. The previous output was 13,222,848 bytes; naming the helper exports adds
92,488 bytes (about 0.7%). No declaration-size improvement is claimed.

All six unchanged compiler-performance fixtures pass with exactly the preceding
implementation's counts:

| Fixture          | Instantiations |   Types |
| ---------------- | -------------: | ------: |
| deep8            |        635,409 |  51,416 |
| wide100          |      1,331,305 |  80,466 |
| commands200      |        335,824 |  62,285 |
| subscriptions100 |        548,398 |  24,566 |
| workspace4       |      2,510,412 | 203,019 |
| workspace8       |      4,278,713 | 279,563 |

## Native editor comparison

Three alternating baseline/candidate pairs per workload use the same driver,
operation probes and native TypeScript 7.1.0-beta server. The baseline is exact
`1ab1c47d5506cb9ff7adc89b496ab254025616c9`, the preceding Subscription-registry
cleanup, rather than the published preview. Candidate source includes this
consumer migration. Each entry below reports median milliseconds and the full
three-run range; all samples are retained.

| Operation                                       |   Baseline median [range] |  Candidate median [range] |
| ----------------------------------------------- | ------------------------: | ------------------------: |
| Workspace Binding hover after edit              |       271.6 [259.0–282.4] |       279.6 [279.0–288.2] |
| Workspace Binding completion after edit         |       267.4 [256.5–307.3] |       275.5 [272.4–278.6] |
| Workspace Block completion after edit           |          47.2 [46.1–58.7] |          65.7 [48.2–66.6] |
| Workspace error appearance                      |       204.8 [203.2–214.9] |       210.8 [208.3–212.4] |
| Workspace error clear                           |       182.8 [181.7–185.7] |       185.5 [181.5–188.2] |
| Website hover after semantic edit               |       213.6 [209.3–234.7] |       211.9 [209.4–238.5] |
| Website completion after edit                   |          14.5 [14.3–16.0] |          16.1 [14.0–33.8] |
| Website first definition                        |       410.7 [406.9–412.4] |       432.0 [431.6–432.4] |
| Website definition after edit                   |       251.1 [241.6–252.0] |       248.8 [241.5–256.5] |
| Website Binding completion after edit           |       227.7 [222.4–229.8] |       233.0 [227.0–241.1] |
| Website changed-URL hover after edit            |       230.1 [218.6–237.9] |       249.0 [243.1–254.7] |
| Website changed-URL error appearance            |       594.2 [583.6–612.5] |       604.1 [587.8–616.2] |
| Website changed-URL error clear                 |       589.3 [586.5–594.5] |       581.7 [573.2–595.8] |
| Website cold completed-Block Message completion | 2,844.4 [2,839.5–2,850.1] | 2,859.0 [2,846.0–2,865.0] |

Most workflows remain similar. The smaller slower cases above are retained,
including roughly 19 ms for Workspace post-edit Block completion, 19 ms for
changed-URL hover and 21 ms for first definition. The authoring convention is
retained for readability; it is not a performance optimization. The existing
roughly three-second cold completed-root access remains a limitation.

Workspace sampled process peaks span 354–446 MiB for the baseline and 345–451 MiB
for the candidate across the bounded fresh sessions. Sampling occurs every
250 ms and may miss brief peaks. Website RSS, long sessions, Neovim UI behavior
and tsrs were not measured in this comparison. Larger static graphs are covered
separately by the fixed compiler fixtures.

## Evidence and release boundary

Local evidence is under `/private/tmp/foldkit-step-helper-authoring-20261025`:
`native-paired/summary.json`, raw paired results, compiler-budget log, declaration
results and Website/Typing Game lint/test/build logs. Example verification is
recorded in the implementation agent transcript (source chunk `f4b187`, test chunk
`68b5b1`); no separate example test log was written. Lint verification is recorded
in its implementation agent transcript and the committed regression fixtures. The identical driver SHA-256 is
`2ea2ca9dfb900574807bf97d6099164f2658d615d9cbe96ec56c105b8fee8c56`.
The archived baseline source digest is
`a8a25369b86725a260a666ea37cbb9870d4335a8280a4e6def7030692c5cb282`;
the measured candidate source digest is
`fbf0b7d58a2e54c5f7fe90957a28f837b83d09be256c6442ae03f375e1dfa496`.
The subsequent lint alias repair and evidence prose do not change the measured
application workload. The initial sandbox-denied server launch produced no
measurements and is excluded.

Independent review found a qualified local-alias lint gap, which is repaired
before the commit gate. Exact committed review is required before the development
branch push. Publication remains held for user approval. This followup does not
change the published Ready snapshot or refresh the earlier nine-package release
rehearsal by implication.
