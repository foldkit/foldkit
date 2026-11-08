# Final rendering benchmark outcome

## Scope and decision

This packet records one prospective ordinary rendering campaign comparing exact
main `a471adb24d750ab9e8d8312edad53ff6f26d961b` with exact current
`6f1c988e1096b7285066892e8eabac74cda131ea` (tree
`34036283c1913ceb5a3b5a202ca2ac541f95e5d3`). The workload, driver, runner,
instrumentation, browser and six-slot cyclic order were frozen before timing.
There was one 12-round batch: 72 retained samples, no discarded sample, no
retry and no added CPU profile, coverage or trace during ordinary timing.

The optimized primary is materially slower in this campaign's measured
callback/event-work sum: the reported summary median is 336.5 ms for current
versus a 266.7 ms midpoint of the two exact-main summaries, a descriptive
increase of 69.8 ms or 26.2%. Current was slower than the round-aligned main
mean in all 12 rounds. This is evidence of a current rendering performance
problem, not a cross-campaign improvement or regression estimate and not a
formal confidence interval.

This repository-sized variant intentionally omits the redundant 37,989,038-byte
whole-repository source archive from the original private packet. Exact current
source remains canonical as Git commit `6f1c988e1096b7285066892e8eabac74cda131ea`
and tree `34036283c1913ceb5a3b5a202ca2ac541f95e5d3`.
`source-provenance.json` retains the omitted archive's stored and decompressed
hashes and the deterministic recreation command. No experimental evidence was
removed or rewritten.

The naive secondary is inconclusive against its controls. Its reported summary
median is 751.2 ms versus a 718.45 ms exact-main midpoint, a descriptive
increase of 32.75 ms or 4.6%; current was slower in 8 rounds and faster in 4.
The exploratory interval crosses zero and the median duplicate-baseline spread
is larger than the paired median delta.

## Ordinary results

| Slot | Driver-reported summary median |
| --- | ---: |
| main optimized A | 274.9 ms |
| current optimized | 336.5 ms |
| main optimized B | 258.5 ms |
| main naive A | 721.2 ms |
| current naive | 751.2 ms |
| main naive B | 715.7 ms |

Optimized primary:

- exact-main summary midpoint: 266.7 ms
- current minus midpoint: +69.8 ms (+26.172%)
- round-aligned median delta: +71.7 ms
- slower/faster/tied rounds: 12/0/0
- median duplicate-baseline absolute difference: 39.15 ms
- exploratory deterministic bootstrap mean-delta interval: [61.112, 86.184]
  ms

Naive secondary:

- exact-main summary midpoint: 718.45 ms
- current minus midpoint: +32.75 ms (+4.558%)
- round-aligned median delta: +23.2 ms
- slower/faster/tied rounds: 8/4/0
- median duplicate-baseline absolute difference: 40 ms
- exploratory deterministic bootstrap mean-delta interval: [-21.673, 47.759]
  ms

The unchanged driver computes summary medians from unrounded in-memory totals,
but retains individual totals only after rounding to 0.1 ms. Reconstructing
from the retained rounded values gives naive medians 721.25, 751.2 and 715.75
ms, which display as 721.3, 751.2 and 715.8 under ordinary one-decimal
rounding. Those values do not contradict the driver's 721.2, 751.2 and 715.7
summaries; the raw sub-0.1 ms information is unavailable. The archive therefore
keeps the driver summaries and the rounded samples, and does not claim exact
reconstruction of the former from the latter.

## Measurement boundary

The ordinary value is the standard harness synchronous/wrapped-callback sum.
Idle requestAnimationFrame callback time is included. The standard
instrumentation does not wrap `MessageChannel.port.onmessage`, so CPU used to
arm cadence tasks through that path is excluded and is not claimed as part of
the total. Boot is reported as zero by this workload. This campaign does not
measure whole-page lifecycle CPU.

Per-run buckets and counts are not available. The unchanged driver retains
rounded total for every run but retains bucket/count detail only from the
seventh result object for each slot. Those representative objects are:

| Slot | sync | animation frame | sync count | animation-frame count |
| --- | ---: | ---: | ---: | ---: |
| main optimized A | 62.5 | 212.5 | 400 | 400 |
| current optimized | 80.1 | 256.1 | 400 | 600 |
| main optimized B | 58.5 | 201.9 | 400 | 400 |
| main naive A | 59.2 | 664.7 | 400 | 400 |
| current naive | 77.3 | 673.6 | 400 | 601 |
| main naive B | 56.7 | 658.4 | 400 | 400 |

The 600/601 current representative cadence counts are accepted by the frozen
protocol. No idle callback time was subtracted.

## Correctness and work controls

Before timing, all six functional slots and four source-matched count captures
passed. The full guard and all 45 mutation controls passed: six canonical
positive controls and 39 expected failures, with no unexpected outcome.

Optimized exact shared work was build 3,906, normalize 3,906, visit 31,248 and
updateChildren 3,387. Naive exact shared work was build 132,125, normalize
132,125, visit 160,063 and updateChildren 131,606. Exact positioned owner
inventories passed, including the nested optimized/naive `buildVNodeData`
counts 403/25,749 and its zero row, current `dualDispatch` 400, frame body 400,
`renderFramePlain` 600, and main Todo update 400. The optimized cross-version
zero delta is the authenticated set of six current-only Todo rows at count
zero; main-only is empty. Both naive zero-delta sets are empty.

## Identities and review

- exact Node: `/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node`,
  SHA-256 `533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4`
- exact Chromium: SHA-256
  `8319963f6625accf51c0dd4f55091ceaf9f09ed39e7a52fed4fae12b2a6b668a`,
  reported version `153.0.8010.12`
- unchanged driver: SHA-256
  `a93c12e6fe411eb5fa8abc342e32974d94496622ba8a475b81f7d6dc9bbc26f0`
- current optimized/naive JS: `95d6e5ba18b4839af1687438ad40d576f55f0d1d3cabd84ab4e30ce4be99fbe9`
  / `b36b9e981dd31a2207ef702e839c6f3a9283a7870216be757330ddf26907ad5a`
- main optimized/naive JS: `852eddbf31ec2d3274568f1f0d503dfeabc6e181c8d2361489b435b13ce14ded`
  / `d3e37e9f695531f98727dadc3ead8bddd4b0bdb93f52b64029880c3d7a78adb4`

Independent review recomputed all 72 samples, cyclic ordering, paired and
duplicate-control arithmetic, immutable lineage and cleanup. It approved the
readback and identified the unrounded-summary/rounded-sample distinction above.
The parent separately reported the new `6f1c988` root CI and full local gate as
green; that external CI claim is recorded here as parent-verified context, not
as a benchmark-produced receipt.

## Cleanup

The capture receipt records no browser process after capture and both IPv4 and
IPv6 timing ports available. A separate scoped post-run check found no Foldkit
benchmark, Playwright or headless-shell process and successfully bound ports
38690, 38700 and 38710. Both the shared checkout and frozen candidate were
clean. The retained 69-byte stderr is the exact accepted pre-work warning from
the generated non-Git timing harness directory; it occurred before server,
browser and timed work.

## Failed setup and guard history

Failures remain failures in the archives:

- v3 retains the original local-listen `EPERM` functional attempt under
  `preflight.failed-local-listen`; the authorized rerun is separately retained
  and does not overwrite it.
- the earlier cadence-only guard packet likewise retains its original
  local-listen `EPERM` receipt under `guards.failed-local-listen`; its later
  authorized functional/count result is separate.
- v3's original count verifier rejected a real zero-versus-absent application
  row difference. That guard was not weakened: v4 introduced independent
  dual-name authority reconstruction, exact source/body relocation proofs and
  a closed six-row zero-delta contract.
- v4 produced complete assets, functional results, four captures and analysis,
  then failed because its verifier expected analysis status `pass` while the
  producer correctly emitted `complete`. No v4 guard receipt or timing result
  was produced. The validation-only actual-shape proof and two-line v5 status
  correction are retained; v5 reran the entire chain rather than adopting v4
  receipts.

No result from a failed setup is relabeled as a successful measurement.
