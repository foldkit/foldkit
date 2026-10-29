# Blocks + Effect Layers stabilization approval summary

This is the 93c acceptance checkpoint. The subsequent
[SSG addendum](preview-stabilization-1811-20261027.md) records the #1811 repair
and affected verification at f15. Results below retain their original pin.

The candidate is prepared for release approval. Publication, release-branch
integration, Ready promotion and merging to main remain held. The published
snapshot is still `f3be22cfeefed437164ad614d08b16d9000e0703`.

## Candidate and scope

Verified implementation: `93c49c77b6d25d9f0aa8213135bb629c1a3e1ff4`, tree
`fcdf5b4dc8760f9f33710b25e311efedb4199742`, on `codex/workspace-example`.
The later evidence commit changes only internal reports. All results below
retain their implementation pin.

This preview is stabilization. Expect one or two further previews depending on
feedback before considering main. Main `b702a5efbb74bebc056b798b414ddb923a82fbd5`
is already integrated through `6f911ffe51b34bb6e2a92d9568e71d739fca8662`.

### Changes since the published preview

- **Required migration:** use `Definition.makeMapBinding(ChildBlock, config)`.
  The standalone function and `foldkit/mapBinding` subpath are removed. Detached
  feature-local helpers retain Definition ownership and contextual inference.
- **Optional initialization helper:** `makeInitIfMissingStep` from
  `foldkit/bindingInit` reuses or initializes direct Record/HashMap children.
  Both paths require registration; reuse preserves Model identity and emits no
  Commands. Custom or wrapped storage keeps its explicit insertion contract.
- **Relative paths:** `Route.parsePathWithFallback` uses normal Route/query
  contracts. Raw controls, backslashes and normalized network paths are rejected.
  Shared URL parsing retains complete query and fragment values.
- **Workspace:** simpler page/issue URLs, retained ID-keyed child state, clearer
  naming and Steps, narrower repository responses and a small local optimistic
  projection. Confirmed data and pending board moves remain separate.
- **Development preservation:** an unsupported opaque DevTools snapshot now
  warns and clears only its Runtime's stale preserved entry. Live Model identity
  remains intact, and preservation resumes after a valid encoding. Declared
  Date/HashMap codecs still round-trip. Update Foldkit and the Vite plugin
  together for the new invalidation protocol.
- **Troubleshooting:** paired local/connected-branch and applied/deferred-Step
  examples sit beside their diagnostics. Incomplete-record guidance starts with
  missing local Message handlers, without weakening registration or channels.

Record-only updates, focused producer callbacks, checked assembly and
ManagedResource registry Layers shipped in f3be. They are not new migrations.

## Feedback accounting

All discovered release-related issues, PRs, migration reports and replies have
been reviewed and given dispositions in the [feedback ledger](stabilization-feedback-20261027.md).
That includes the original four reports, #1698, contributions responding to
#1737, the foldkit-plus report and the latest dynamic-plugin question. The
[earlier checkpoint](preview-stabilization-20261027.md) retains the exhaustive
coverage counts and its original source pin.

The final refresh also includes [#1810](https://github.com/foldkit/foldkit/issues/1810).
Its requested paired examples are implemented. Its snapshot failure is
reproduced through the actual Program/Runtime callbacks and configured plugin
queue, then repaired and tested. The original complete browser/HMR sequence is
not reproduced. Unsupported opaque values are not promised lossless reload
preservation. Missing-handler diagnostic priority remains a documented
limitation. [Assessment and exact proof](stabilization-final-20261027/issue1810.json).

This does **not** mean every suggested feature is implemented. Remaining work
and limits are explicit:

- **#1709:** cold root/type expansion can take seconds; long-session memory
  stability is unverified. tsrs is a tested optional editor recommendation;
  official TypeScript remains the repository/CI checker.
- **#1776 and #1810:** some rejected inputs lead with misleading structural or
  final-overload diagnostics. Rejection remains sound; guidance does not fix
  compiler diagnostic priority.
- **#1777:** an unresolved generic attached-Service identifier still requires
  the documented caller-owned `toLayer` boundary once concrete. A one-stage
  unresolved generic factory is not supported.
- **#1662 / #1663:** automatic OutMessage propagation, derived/default view
  slots and additional static slot-collision checks remain unimplemented
  proposals. Explicit forwarding policies, stable slot IDs and the runtime
  duplicate-boundary guard remain the contract.
- Portable cross-runtime envelopes, arbitrary operation Messages, root/child
  observers, parent-derived child Subscription context, lazy graphs and
  transparent hot plugin replacement are not adopted APIs. General Query, UI
  and agent proposals stay outside Blocks/Layers stabilization.

These are disclosed limitations or unimplemented proposals, not newly approved
deferrals. Record/HashMap Bindings, ManagedResource aggregation, pending-Command
inspection and the adopted diagnostic improvements are implemented.
The dynamic-plugin answer is prepared in the ledger; no public reply was posted.

## Verification

All **17 integrated gates** pass at the exact implementation pin: public builds,
recursive source typechecks, source/emitted/relocated declarations, compiler
diagnostics, six compiler-performance fixtures, lint, script checks, Website
production/API build and the complete affected runtime suites.

| Suite              | Passed | Existing skips |
| ------------------ | -----: | -------------: |
| Foldkit            |  3,842 |              1 |
| Vite plugin        |    333 |              3 |
| DevTools           |      6 |              0 |
| Foldkit UI         |  1,301 |              0 |
| Workspace          |    154 |              0 |
| Website            |  1,500 |              0 |
| Lint plugin        |    665 |              0 |
| Repository scripts |    232 |              0 |

Nine metadata gates pass, including formatting, exports, circular imports and
Knip. Skill/changeset comparisons pass against the exact integrated main tree.
This local checkout's unavailable origin/old ancestry prevents the ordinary
origin-based invocation; the pinned-main equivalents are qualified, not
relabeled as default-command passes. The prior integrity-checked restoration of
formatly's missing zero-byte installed file remains unchanged; no dependency,
lockfile, shim or exemption was added.

The ordinary Workspace root emits **152 declarations / 12,272,552 bytes** and
passes strict physically relocated acceptance/rejection with
`skipLibCheck: false`. Its published exact Binding tuple boundary is retained;
the ordinary Block assembly file needs no extra header. Large declarations and
the earlier synthetic scaling limit remain limitations.

All six compiler fixtures pass their current reviewed ceilings. The earlier
map-method adoption deliberately revised only the four-group Workspace ceiling
from 2,639,574 Instantiations / 206,314 Types to **2,642,699 / 229,173**. Other
ceilings and all fixture sources remain unchanged. There is no subsequent
increase. The two-round checker-order proof retains its ae2 checkpoint pin.
[Gate commands, log hashes and declaration results](stabilization-final-20261027/verification.json).

The initial 13d full-core run caught two detached test-target queries in the new
preservation fixture. The test-only 93c correction restores live-Document queries
without weakening assertions. Its focused and full-core runs pass. Failed logs
retain their original source pin; they are not counted as passing evidence.

## Installed-package and browser rehearsal

Nine packages were freshly built and packed from the frozen implementation.
Source digest:
`348f99655be9d899a41d10c6c584e8503a35270905b7c8e2ff4b00b573bb3e07`.
The source manifest includes all 7,044 tracked files and 106 recorded generated
seeds. Independent SHA-256 and SHA-512 checks match every frozen tarball.

- Isolated Coverchart passes typecheck, lint, **40 tests**, production build and
  five browser flows. The actual repository stays at
  `677b804e9aa0d0d1f636067079ae404ead84115a`, with its existing `?? .claude/`
  status and all **88 tracked file hashes unchanged**.
- Fresh SPA, SSG and SSR scaffolds pass typecheck, lint, tests, builds and browser
  behavior. Installed testing, event delivery, dynamic initialization,
  initialization-family and stabilization contracts pass.
- Installed public `foldkit/model-preservation` passes source acceptance and
  rejection, a missing-id negative control, emission, strict relocation and
  runtime codec checks. This protocol proof is not a browser/HMR claim.
- Workspace passes **33/33 browser cases**, zero skips, retries or flakes.
  Expected recoverable non-JSON DevTools warnings do not interrupt live use.

Sandbox DNS and one missing offline cache artifact required recorded
infrastructure retries. Package-age policy stayed enabled. Exact existing and
target exemptions coexist only during lock transition; final frozen offline
installation retains only target exemptions. Fixture-only SSG/third-party
resolution controls remain documented. No artifacts were rebuilt for recovery.
[Artifact identities and compact outcomes](stabilization-final-20261027/package-rehearsal.json).

This is local packed-package acceptance. Published registry acceptance, actual
Coverchart upgrade and immutable deployment verification remain post-approval
gates. Local version labels are not public installation instructions.

## Performance

Final measurements run after all other builds, checkers and browser rehearsals
stop: **12 native sessions and 36 Lustre samples**, all passing semantic,
correctness and source/declaration integrity checks. Every valid sample remains;
no forced GC, discarded warmup or selectively extended batch. Main, published
and candidate builds are fresh, with matched cached dependencies and the
unchanged harness. This is not a historical-lockfile reinstall.

Official native TypeScript is `7.1.0-beta`, Node `24.22.1`, and actual common
Chrome is `156.0.8078.48`. Three fresh native pairs measure each workload;
six balanced rotating rounds measure rendering.

| Native request, median                            |    Published |    Candidate |
| ------------------------------------------------- | -----------: | -----------: |
| Workspace Binding hover after edit                |       281 ms |       265 ms |
| Workspace Binding completion after edit           |       278 ms |       254 ms |
| Workspace completed Block completion after edit   |        48 ms |        51 ms |
| Workspace error appearance / clear                | 210 / 191 ms | 188 / 176 ms |
| Website changed-URL hover / completion after edit | 250 / 239 ms | 251 / 247 ms |
| Website error appearance / clear                  | 629 / 618 ms | 648 / 622 ms |
| Website cold completed-Block root diagnostics     |     3,496 ms |     2,996 ms |

Warm workflows improve or remain similar in this small sample. Website ranges
overlap, and one roughly one-second candidate diagnostic session is retained.
Cold root access still takes roughly three seconds. These are native requests,
not end-to-end Neovim/tsrs timings or large-app scaling guarantees. Release-pin
app factoring differs, so this does not isolate one framework encoding.

Maximum sampled RSS is 412 / 409 MiB for published / candidate Workspace and
824 / 937 MiB for Website. The candidate Website peak is higher in this batch.
Sampling every 250 ms does not bound short peaks, retained heap or long-session
memory. No process reaches the unchanged 4 GiB cap.

| Lustre workload, median total |     Main | Published | Candidate |
| ----------------------------- | -------: | --------: | --------: |
| Naive                         | 377.9 ms |  440.1 ms |  445.1 ms |
| Optimized                     | 161.5 ms |  216.4 ms |  208.6 ms |

Versus published, candidate ratios of medians are **+1.1% / -3.6%** for naive /
optimized; median paired ratios are **0.970 / 0.973**, with candidate faster in
4/6 pairs for each. There is no material new rendering regression established.
The sample does not establish another general speedup.

**Main remains faster.** Candidate totals are **17.8% / 29.2% above main** by
median, with median paired increases of **6.0% / 20.8%**. Optimized candidate
is slower in all six main pairs. This remains a performance gap against main. Workload totals aggregate synchronous handlers and animation
callbacks across add-100/toggle-100/delete-100; they exclude boot/waits and do
not isolate DOM patching or presentation latency.

Candidate JavaScript gzip is **128,963 / 130,346 bytes**: 64 / 55 bytes above
published and 31,882 / 32,550 above main. Block authoring declarations are
byte-identical to the ae2 checkpoint; the only changed core declaration is the
expected internal preservation protocol. All previous batches retain their
source pins and results separately; absolute timings are not pooled or selected
between batches.
[All per-run samples and identities](stabilization-final-20261027/performance.json),
[expanded interpretation and ranges](stabilization-final-20261027/performance-report.txt).

## Independent and security review

Independent review passes the exact production repair and test-only followup.
The final Daybreak addendum passes `c6831b8` through `93c49c7`, with no new
actionable findings. Its detached source remains clean and all 7,044 manifest
entries match. [Independent review](stabilization-final-20261027/independent-review.txt),
[Daybreak addendum](stabilization-final-20261027/daybreak.txt).

The preceding full review and ae2 addendum remain in the checkpoint: both Low
input-boundary findings were repaired, with rejection, relocation and mutation
controls. Inherited dependency advisory, sanitizer, trusted DevTools ingress,
fixed-port/shared-network and Runtime-local envelope qualifications remain.
No fresh network dependency audit or clean dependency-advisory claim is made.
Static review is separate from executed tests and browser acceptance.

## Release handoff

No release or Ready snapshot is promoted. Keep the three existing consumer
starting points. After approval, integrate the reviewed candidate into the
preview branch, verify the published nine-package manifest and matching
immutable documentation deployment, then update PR #1655 and actual Coverchart
from those verified identities. Foldkit and its Vite plugin move together.
Main remains unchanged.

Original evidence hashes and compact-record scope are retained in the
[input manifest](stabilization-final-20261027/retained-inputs.json).
