# Open performance PR assessment

## Decision

The direct Attribute-constructor portion of
[#1575](https://github.com/foldkit/foldkit/pull/1575) was adapted to preview
`54f8bcd443b4fd18952403a3d02e212abf872d58`, verified in an isolated source
copy, and measured with the established six-slot TodoMVC protocol. It does not
meet the acceptance criterion for the current preview regression: the optimized
result does not show a reliable reduction beyond byte-identical baseline
variation. It must not be described or integrated as a demonstrated runtime
fix.

The adaptation does produce a deterministic gzip reduction of 1,332 bytes in
the naive artifact and 1,327 bytes in the optimized artifact. That is bundle
size evidence only. It is not a speed or allocation claim, and it addresses a
small part of the measured 48 KB gzip increase.

No CPU or allocation profile was taken because the ordinary timing batch did
not establish a runtime improvement. No production source from this
experiment is present in the shared checkout.

The preview target remains the observed Mount-validation traversal overhead,
approximately 48% more optimized work, and approximately 48 KB more gzip than
main. Direct Attribute construction happens before that validation walk and
does not remove its full VNode traversal. The measured #1575 result therefore
cannot substitute for evidence on the dominant validator path.

## PR sources

The reviewed PRs are historical inputs, not patches that can be transplanted
onto the current preview:

| PR                                                    | Base                                       | Head                                                                                                                             | Patch SHA-256                                                      | Disposition                                                          |
| ----------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [#1575](https://github.com/foldkit/foldkit/pull/1575) | `482593707a08de3e6f13dd9b32140ebf1b8345be` | [`5034908a43dec249761b851b08b6af0f8b601eee`](https://github.com/foldkit/foldkit/commit/5034908a43dec249761b851b08b6af0f8b601eee) | `0a427a6b517170a5638c3269cbd00f689247953b288739aa4e39e9dd27016cf4` | Adapted and measured; not accepted as a regression fix               |
| [#1576](https://github.com/foldkit/foldkit/pull/1576) | `5034908a43dec249761b851b08b6af0f8b601eee` | [`e72fe71fbee489ee9eec160c37a9c81677291be7`](https://github.com/foldkit/foldkit/commit/e72fe71fbee489ee9eec160c37a9c81677291be7) | `13b0d5d2e6b10bf3355699c6a2008e216352b74600fa83bd99707d105fd104f6` | Do not migrate in this queue; split before any future prototype      |
| [#1859](https://github.com/foldkit/foldkit/pull/1859) | `caa9472abc3e060d7c8d3b90d824ab85865f166c` | [`bf2b82636c00225f19d60bacfa19b1b5c1ab567e`](https://github.com/foldkit/foldkit/commit/bf2b82636c00225f19d60bacfa19b1b5c1ab567e) | `43454ca92b6ae19383fa70bc020d088f7c17c1500e028f8d2786c81dd685b3aa` | Benchmark infrastructure only; not a fix for the measured regression |

At the #1575 head, `packages/foldkit/src/html/index.ts` has SHA-256
`f6fdc377e12c31144089ec7945ae3372ce03e0d08ed158bb69db8f3fa968f3a9`
and `directAttribute.test.ts` has SHA-256
`8f536897ec65d2a5acc1133f6c748a0152e6fe92ff60bb6abfbe364738b7e0fb`.
These hashes prevent a later similarly named branch or amended commit from
being mistaken for the reviewed source.

The bundle-reachability PRs #1581 and #1585 were investigated separately and
are outside this report.

## Bounded #1575 adaptation

The preview source before adaptation was 218,838 bytes with SHA-256
`3b2464b443db3614e03dda8e9285fbada713788d906c8c198ab23e7469eb06ac`.
The adapted source was 217,978 bytes with SHA-256
`4ac1d2c011fe79cba71a92663496e2d4035b4990cb848c1b2e9a08d4b8bc3749`.
Only `packages/foldkit/src/html/index.ts` differed in production source: 371
insertions and 637 deletions.

The adaptation deliberately retained current preview contracts rather than
recreating the old PR wholesale:

- 312 positional Attribute constructors use final object literals.
- The current generic `OnMount` implementation is source-identical to the
  baseline.
- `Prop` and `OnCustomEvent` remain the raw Effect constructors required by
  CustomElement payload forwarding.
- `Attribute`, `TaggedAttribute`, `AttributeDefinition`, `HtmlAttributes`, and
  `HtmlBuilder` source declarations are unchanged.
- No old changeset, documentation, API shape, or performance number was copied.

The focused contract test covers field order and descriptors, fresh identity,
payload identity, optional fields, the inherited `_tag` setter case, raw proxy
and symbol copying, and CustomElement raw constructors. It passed 16 tests. A
temporary mutation that reversed `Class` field order failed the expected own-key
assertion; the mutation was removed. The HTML and CustomElement regression set
passed 263 tests across 26 files, source typechecking passed, both declaration
builds passed, and formatting passed.

There is one declaration-equivalence limitation. The 388 emitted declaration
files are public-signature equivalent, but they are not byte-identical.
`dist/html/index.d.ts` changes one non-exported helper declaration from the full
Data tagged-constructor destructure to `{ Prop, OnCustomEvent }`. The diff has
no exported declaration or public type-signature change. The baseline and
candidate declaration hashes are recorded in `correctness-receipt.json` rather
than calling the full files equal.

## Build result

The build used the recorded Node 26.13.0 binary, Vite 8.3.5, Rolldown 1.2.15,
the current lockfile, explicit production mode, and identical dependency
realpaths. `NODE_ENV`, `VITE_USER_NODE_ENV`, and `MODE` were unset; `CI=1` and
the recorded locale were fixed. The baseline builds reproduce the retained
published-preview artifact hashes exactly.

| Variant   | Baseline raw / gzip | Candidate raw / gzip | Delta raw / gzip |
| --------- | ------------------: | -------------------: | ---------------: |
| Naive     |   475,519 / 147,123 |    476,157 / 145,791 |    +638 / -1,332 |
| Optimized |   482,112 / 148,452 |    482,750 / 147,125 |    +638 / -1,327 |

The gzip result is deterministic across the paired build and useful as a
bundle-size observation. It does not establish that constructing the resulting
objects is faster. The complete tool and artifact hashes are in
`build-receipt.json` and `artifact-receipt.json`.

## Timing result

All six deployed slots passed the unchanged functional browser preflight. The
unchanged driver ran 12 cyclic rounds, retained all 72 samples, and
placed each slot in each ordinal position twice. Every run remained
cross-origin isolated with 400 synchronous and 400 animation-frame callbacks.
The runner closed Chromium and the server; the benchmark port was available on
IPv4 and IPv6 afterward, with no benchmark Chromium process before or after.

| Variant   | Baseline A | Candidate | Baseline B | Candidate paired median | Duplicate A/B median absolute spread |
| --------- | ---------: | --------: | ---------: | ----------------------: | -----------------------------------: |
| Naive     |   539.9 ms |  519.1 ms |   559.9 ms |                -2.75 ms |                             121.8 ms |
| Optimized |   298.5 ms |  337.0 ms |   384.3 ms |               -26.15 ms |                             109.6 ms |

The naive medians and paired result must be read separately. Its candidate
median is below both baseline medians, so a narrower view-construction or
allocation benefit remains plausible. In the same-round comparison, however,
the candidate was faster than the midpoint in only 7 of 12 rounds. Its -2.75 ms
paired median is far smaller than the 121.8 ms duplicate-baseline spread. This
batch therefore did not measure the plausible benefit.

The optimized candidate median lies between the two byte-identical baseline
medians. It was faster than the same-round midpoint in 8 of 12 rounds, but its
-26.15 ms paired median is also smaller than the 109.6 ms duplicate-baseline
spread. That does not demonstrate a reliable reduction in the current measured
optimized regression.

The unchanged driver reports rounded per-run totals and only representative
median bucket counters, not unrounded per-run view-construction or allocation
measurements. Its observed duplicate-baseline variation dominates the expected
constructor effect. This is the precise limitation; it is not evidence that the
constructor change has no narrower effect.

The original criterion required a reliable optimized improvement beyond the
negative-control noise floor. It was not met. No profiles were captured.

## Recommendations

### #1575

Do not integrate #1575 as a runtime-regression fix. Retain the prototype only
for a separate Attribute-construction question or consider its deterministic
gzip reduction as an independent bundle-size tradeoff. A future focused
measurement should alternate baseline and candidate in isolated processes,
construct the representative Attribute shapes from the contract fixture, and
measure a fixed render-only TodoMVC Model without DOM patching. It must report
unrounded construction time, allocation, and GC behavior with a duplicate
baseline control. It must keep current `OnMount`, `Prop`, and `OnCustomEvent`
semantics and rerun the retained contract, mutation, declaration, and bundle
controls.

### #1576

Do not migrate #1576 in this queue. If later diagnostics still identify VNode
construction as material, split it into two prototypes:

1. Reuse built-in element metadata such as the lowercase tag and property
   classification while keeping current child handling unchanged.
2. Only after that is measured, evaluate the broader normalize-children-once
   path that bypasses generic snabbdom `h` normalization.

The second piece changes primitive-to-text-VNode construction and is more
correctness-sensitive. Its checks must cover the existing keyed, lazy,
`patchVNode`, content-ownership, property-representation, and child-normalizing
tests, plus emitted declarations and the same six-slot negative controls. Do
not attribute #1575's gzip result or historical #1576 numbers to either split
prototype.

### #1859

#1859 supplies a keyed table and external benchmark procedure, not an
optimization for Mount-validation traversal. Do not transplant its historical
results, website copy, old Foldkit API usage, or concurrent memory conclusions.
If the framework queue later needs broader keyed evidence, first adapt only the
benchmark entry to the current Block, Message, Command, and lazy-cache
contracts. Pin the upstream harness, browser, Node, source commit, and served
asset hashes; pass keyed identity, smoke, and CSP checks; then collect the nine
CPU operations with the stated sample count. Run ready, create, and repeated
create/clear memory workloads in isolated browser processes with memory
pressure recorded. Those results would characterize keyed-table behavior, not
explain the current TodoMVC Mount-validation regression.

## Retained evidence

Hash-bound receipts, the focused fixture, and the exact executed scripts are in
[`preview-open-performance-prs-20261107/measurements`](preview-open-performance-prs-20261107/measurements).
Portable adaptation, audit, and paired-build tools are in
[`preview-open-performance-prs-20261107/tools`](preview-open-performance-prs-20261107/tools).
The executed scripts preserve the absolute temporary paths used for the run;
the portable tools accept repository paths explicitly and bind the adaptation
to the recorded preview and PR source hashes.

Given isolated `baseline` and `candidate` copies under one workspace, the
source transformation is reproduced with:

```sh
<recorded-node-26.13.0> \
  internal/preview-open-performance-prs-20261107/tools/adapt-direct-attributes.mjs \
  <workspace>/candidate <foldkit-repository>
node_modules/.bin/oxfmt \
  <workspace>/candidate/packages/foldkit/src/html/index.ts
<recorded-node-26.13.0> \
  internal/preview-open-performance-prs-20261107/tools/audit-direct-attributes.mjs \
  <workspace>/baseline <workspace>/candidate <foldkit-repository>
<recorded-node-26.13.0> \
  internal/preview-open-performance-prs-20261107/tools/build-twins.mjs \
  <workspace> <foldkit-repository>
```

The workspace package links must resolve inside their matching baseline or
candidate copy. The build tool asserts the benchmark's Foldkit realpath before
building and rejects a different Node binary. The retained focused test fixture
is copied into the candidate before the correctness commands described above.

The final timing-analysis SHA-256 is
`b3a84d7154f05f46259aad910732a3136675ad2b7fd5c74800d36fa9b48463dc`.
