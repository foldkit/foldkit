# November 7 preview release verification

## Candidate and authorization

The implementation candidate is `1117a93316ff8111d402bffc995067476ec97983`, tree
`ced96aee39bcc06070ae3b781cf7e45980be5b3e`, on top of integrated `7395b63d88`.
The user authorized publication after verification and approved OpenAI Daybreak
source review, relevant history and review-driven rechecks through publication.
The original working directory and unrelated work are preserved.

The record completion default, migration and compiler comparison are described
in the [implementation report](../block-record-completion-20261107/README.md).
Custom Effect construction remains explicit. Child acquisition and child Model
initialization retain separate lifetimes.

## Independent and security review

An independent agent [reviewed the exact committed diff](independent-review.txt)
without editing it. Its separate AST comparison confirms 212 migrated
constructors preserve every non-children statement, property and provider.

The authorized [Daybreak report](security/measurements/report.txt) found no
substantiated new security defect and no implementation-level release blocker.
It found a moderate release-correctness problem: current package READMEs used
removed initializer contracts and superseded ordinary completion guidance.
The follow-up corrects that class across current READMEs while preserving
historical/native compiler documentation. The root and Core Counter/entry
examples compile from their copied text. Replacing InitArgs with the obsolete
Init key makes the consumer fail with TS2353. The existing Personal Blog
Markdown view contract also compiles. The follow-up changes documentation only.

The [receipt](security/measurements/receipt.json) pins the reviewed source,
authorization, invocation, prompt, event stream hashes and source verification.
All 9,089 tracked entries retain their Git blob identity, byte size, SHA-256,
executable bit, inventory and literal symlink target. The review was read-only;
it did not build, test, install dependencies or probe applications. The request
selected `gpt-daybreak-blue-latest`; backend identity is not independently
attested. Static review does not certify publication or deployed artifacts.

## Final rendering comparison

The unchanged workload ran against actual main
`a471adb24d750ab9e8d8312edad53ff6f26d961b` and the committed implementation.
All four functional preflights pass. The cyclic batch retains all 32 timing
samples, with none discarded. Driver/harness identity, representative counters
and omitted-sample negative controls pass. An initial loopback permission
refusal happened before timing and is retained separately.

| Workload  | Main median | Candidate median |          Difference |
| --------- | ----------: | ---------------: | ------------------: |
| Naive     |    654.9 ms |         710.6 ms |   +55.7 ms (+8.51%) |
| Optimized |    207.4 ms |         308.1 ms | +100.7 ms (+48.55%) |

All eight optimized pairs and seven naive pairs are slower. Host load was
2.68 before and 2.38 after capture, with 13.20/12.84 GB reported free memory.
This confirms a cost in this workload, without establishing a universal
slowdown percentage or assigning it to one API. The optimized rendering gap
is a remaining limitation of the preview; compiler acceptance does not imply
rendering parity with main.

Candidate JavaScript gzip totals are 147,123 bytes naive and 148,452 optimized,
respectively 48,092 and 48,711 bytes above main. Those totals add only 208 and
200 bytes to the preceding candidate's artifacts, but the artifacts differ,
so the preceding 64 samples are historical and are not pooled into this run.
The benchmark uses its unchanged manual Effect completion; it does not isolate
the new record API's cost. Main artifacts are reused byte-for-byte with 349
source-blob checks and fresh functional preflights, rather than rebuilt from a
new independent dependency installation.

The [summary](rendering/measurements/release-rendering-summary.json),
[raw timing](rendering/measurements/timing-final.log),
[analysis](rendering/measurements/final-analysis.json),
[artifact receipt](rendering/measurements/final-artifact-receipt.json) and
[retained-file inventory](rendering/measurements/retained-files.json) preserve
the measurements and their limitations. The prior two batches are retained in
[their dated report](../preview-followup-20261106/rendering/README.md).

## Feedback and dependency refresh

The November 7 refresh found no new contributor pull request or preview-PR
reply after the assessed October 30 discussion. The preview discussion has
19 entries. Main is still `a471adb24d`; its content is already integrated,
including matching public versions/changelogs and the Effect reference tree.

Issues #1910 and #1911 explicitly target the preview after this candidate and
state that they are not blockers here. They concern Story Subscription emission
and resolver lifetimes. Query proposals #1906, #1907 and #1908 are new API
requests, rather than reports of incorrect existing behavior. The motivating
#1905 testing cases are addressed; a complete general repository audit is not
claimed. #1662 and #1663 retain the user's explicit post-main deferral.

A fresh [production audit](measurements/dependency-audit.json) reports no
advisories. The [complete dependency audit](measurements/full-audit.json)
reports two moderate build-tool advisories, in glob and minimatch, and no high
or critical advisories. Their affected paths and earlier assessment remain in
the [dependency disposition](../layered-constructor/dependency-advisories/README.md).

## Publication evidence

This is the pre-publication verification record. The normal push gate,
protected PR and merge-group checks, final documentation review, coherent
package manifest and immutable Website verification must complete before
publication is reported. The actual published source and package/deployment
links belong to the generated Ready section in #1655. No guessed version or
deployment URL is assigned here.
