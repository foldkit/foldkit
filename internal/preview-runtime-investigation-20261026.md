# Rendering cost investigation

Publication remains held. This followup starts from
`8cce3fa0b8ff6499c2bd17e56fcbef1d54feb08c` and pinned main
`b702a5efbb74bebc056b798b414ddb923a82fbd5`. The framework, Vite plugin,
benchmark and aliases at that preview base match the earlier measured
`978c07a093bdcdadf2a94cf8ab0e5f9e985a008d`. The earlier comparisons retain
[their original pins and samples](preview-lustre-20261026.md).

## Fresh comparison

Six rotating rounds compare fresh production builds of main, unchanged preview
and the runtime candidate, with naive and optimized views. All 36 samples pass
correctness assertions. Main and unchanged-preview JavaScript rebuild byte for
byte to the earlier captured bundles.

| Workload  | Main median (range), ms | Unchanged preview median (range), ms | Candidate median (range), ms |
| --------- | ----------------------- | ------------------------------------ | ---------------------------- |
| Naive     | 469.6 (307.0–513.3)     | 562.6 (507.4–612.9)                  | 565.3 (507.4–584.4)          |
| Optimized | 190.9 (144.2–217.4)     | 266.8 (264.3–275.3)                  | 232.9 (185.5–283.9)          |

The optimized candidate is **12.7% faster than unchanged preview**, with five
of six round pairs faster and a median paired ratio of 0.872. It remains
**22.0% slower than main** by ratio of medians. The combined changes remove
about 45% of the optimized excess over main in this batch. Their individual
contributions are not isolated by this final comparison.

Naive time is effectively unchanged: +0.5%, three pairs faster and three slower,
with overlapping ranges. Its remaining main cost is 20.4%. This is an optimized
workload improvement, not general rendering parity or a naive speedup.

The predeclared acceptance criterion required at least a 10% optimized median
improvement, five faster pairs, no material naive regression and all correctness
assertions. It passes. All valid samples remain included, including the slower
first optimized candidate sample and unusually fast second main-naive sample.
No batch was selectively extended or filtered.

[Final samples, build identities, method and calculated comparisons](benchmarks/runtime-final-20261026.json)
retain the full data. These totals sum instrumented callback and synchronous
event-handler execution across the add-100, toggle-100, delete-100 runbook.
They exclude boot and waits. They are not a delay per interaction, an isolated
DOM-patcher measurement, or a large-application scaling guarantee.

## Profile attribution

Diagnostic phase counters place 44.7 ms of a 67.2 ms optimized main-to-preview
median gap in full-tree Mount-registration validation. View construction adds
18.7 ms and update adds 5.7 ms; patch time does not increase in that pair.
Those counters add overhead, so their absolute times are diagnostic rather than
release timings.

Both variants make 26,843 lazy decisions: 26,140 hits and 703 misses. No
miss is attributed to dispatcher, Mount dispatcher or render-owner identity.
This screen does not support lazy-cache invalidation as the cause.

Two paired CPU captures identify validation among the added costs. Two paired
heap captures estimate about 12.0 MB allocated on main and 21.7 MB on preview;
scanner allocation ancestry accounts for roughly 6.3 MB per preview capture,
primarily Set entries. Dispatcher/context paths also allocate more. Sampled
allocation is not retained memory. CPU GC samples overlap, so added GC pause
time is not an established cause.

Profiler activation and the extra post-boot setup change absolute timings
substantially. Those captures are used for attribution only, never pooled with
unchanged benchmark timings. [Diagnostic evidence and experiment ledger](benchmarks/runtime-diagnostics-20261026.json)
retain source/map hashes, counters, all exploratory totals and capture limits.
Full profiles, source maps, rejected patches and orchestration remain under
`/private/tmp/foldkit-runtime-dive-20261026` and
`/private/tmp/foldkit-runtime-cost-analysis`.

## Retained implementation

- Use a renderer-local WeakMap with a fresh visitation token on every scan.
  Only branches require visitation bookkeeping; leaves are still checked.
  Missing-definition storage is allocated only when a violation is found.
- Cache an occurrence-guarded dispatcher by exact render Frame and raw boundary
  dispatcher. Resolve the boundary dispatcher before consulting that cache, so
  lazy tracking, eviction and transactional restoration still run.
- Skip the empty boundary-occurrence iterator on lazy-cache lookup. Nonempty
  collections retain their existing stale-occurrence checks.

Every render still validates Mount identities before DOM patching, including
mutated descendants of cached views. No successful-subtree cache is introduced.
Runtime-local weak keys do not keep VNodes alive. Dispatcher guards still check
occurrence validity at delivery time. Public API and application authoring are
unchanged.

Rejected experiments include removing validation, dispatcher factory extraction,
ancestor-array visitation, a childless-reconciliation combination, and a simpler
full walk without visitation tracking. Removing validation is unsafe. The other
encodings did not show a sufficient repeatable benefit. The plain walk's final
bounded comparison adds only 3.7% at the median over the retained candidate,
with two of three pairs faster; it also changes defensive behavior for
unsupported cyclic raw graphs. It is not integrated.

## Bundle cost

Source-map rebuilds account for all of the earlier raw-byte increase. In the
naive bundle, 78,566 of 113,747 added raw bytes come from Block machinery,
15,749 from Runtime, 14,791 from other Foldkit code and 4,500 from Effect and
dependencies. The remaining 141 bytes are application/other code. About 69% of
that raw growth is retained Block authoring and Binding machinery reachable
through Definition methods. Gzip contributions are not additive.

No newly retained HttpClient, Crypto or browser provider explains the increase.
No small, proven tree-shaking fix was found. Bundle growth does not itself
establish the hot-path cause; boot is excluded from the runbook.

The retained candidate adds 48 naive and 63 optimized gzip bytes over unchanged
preview. It remains 31.8 KB and 32.4 KB above main. The final artifacts and
original captures use the same Node gzip method.

## Verification and release boundary

- Core: 3,798 passing tests, one existing skip, coverage gates pass.
- UI: 1,301 passing tests. Workspace: 153 passing tests.
- Core source and separate route-Step/Program source checks pass.
- External source/emitted acceptance and rejection, strict relocation, compiler
  diagnostics, native completion and inferred-configuration documentation checks
  pass on official TypeScript 7.1.0-beta.
- All six unchanged compiler-performance ceilings pass. All 289 emitted
  declaration files are byte-identical to the preceding frozen candidate.
- New regressions cover reused mutable lazy descendants, the same captured Frame
  across remount and transaction restoration, stale occurrences and live/replay
  isolation. Mutation controls confirm failures when one token is reused across
  renders or the Frame cache bypasses boundary lookup. Exact source is restored.
- All six final production builds pass browser add/toggle/delete, editing,
  filtering, toggle-all/clear and retained keyed-row identity checks.
- Focused lint, formatting and independent implementation review pass.

The remaining main costs are visible in the approval summary. This investigation
supports the bounded reduction above; it does not establish that all rendering
performance issues are resolved. The preceding package rehearsal retains its
original pin. The fresh rehearsal below covers this runtime delta. Published
Ready and the integration branch remain unchanged until approval.

## Fresh packed-package rehearsal

The frozen implementation is `fa96bf7d907fe86cf02c0c6c12cd33e1b7a9923c`.
Its source digest is
`3e9c0e0265ca70256b84356cd932caf87808bf53d2fd6e6f35ff88c59f7ebd47`.
All nine packages use matching `-local.3e9c0e0265ca` snapshot labels. The measured
runtime source hashes match the frozen inputs. The eight libraries build with
official TypeScript 7.1.0-beta; the CLI uses its own declared TypeScript 7.0.2.

[Artifact hashes, installed provenance and fresh gate results](benchmarks/runtime-rehearsal-20261026.json)
record successful Coverchart source/lint, 40 tests, production build and five
persistence/keyboard browser behaviors. Generated SPA, SSG and SSR projects pass
their source, lint, tests, builds and hydration/routing browser checks. Installed
testing, event-delivery, variant Binding and initialization-family contracts
pass. All 32 Workspace browser tests pass with no retries or flaky results.

All 6,894 tracked files are included in the snapshot. Its 106 additional generated
files are recorded: 102 Website build outputs, two generated API data files and
two lint presets. Website outputs are not consumed by these gates; lint presets
are regenerated during the package build. This is no claim of a fresh Website
build or deployment. Scaffold-only dependency-resolution controls retain frozen
lock choices without relaxing the active policy; SSG uses a local metadata
transport for the exact unpublished UI peer.

The first sandbox-blocked registry-metadata attempt is excluded. The
network-enabled rerun passes. Expected favicon 404s and Vite configuration/color
warnings remain in the original logs. The occupied preexisting Workspace MCP
port is preserved; these browser checks do not prove relay availability.

The actual Coverchart checkout remains at
`c51e856b2e75ca44106e37ead24f9c4e8046aef0`, with its Git status and all 88 tracked
file hashes unchanged. Full local evidence is under
`/private/tmp/foldkit-runtime-final-rehearsal-20261026`. The local rehearsal does
not establish published-registry acceptance or authorize release promotion.
Subsequent internal evidence edits preserve the frozen package inputs.
