# Next preview release handoff

## November 7 record completion

The user approved publication after the current work, then separately approved Daybreak review of the final Foldkit candidate and relevant history, including review-driven fixes and rechecks through publication. These approvals supersede the older holds below. The verified published snapshot remains `90746b32d2ca` until a new release is actually published.

Record-form `Block.makeLayer({ init, update, view, ... })` acquires the authenticated init Composition's explicit registered inventory under the existing Layer Scope and memoization. Custom Effects retain explicit child acquisition. The prototype passes source/emitted/relocated checks, realistic Workspace and generic UI consumers, deferred initialization and lifecycle checks. Ordinary consumers and active guidance are migrated. The full adoption gates, exact-commit review, protected integration, refreshed performance evidence and authorized Daybreak review still precede publication. See the [current task board](next-preview-tasks.md#november-7-record-completion-and-publication) and [compiler comparison](block-record-completion-20261107/performance.json).

The implementation is frozen as `1117a93316ff8111d402bffc995067476ec97983` and passes independent review. The [final verification record](preview-final-20261107/README.md) retains Daybreak, the fresh 32-sample rendering comparison and dependency audits. Daybreak reports no new security finding; its current-README defect is corrected in a documentation follow-up. The optimized workload remains slower than main, with 207.4/308.1 ms medians and about 48 KB additional gzip. Publication is authorized with verification still required; no earlier approval hold is reinstated by these dated reports.

## November 6 follow-up feedback

The [follow-up report](preview-followup-feedback-20261106.md) and
[task board](next-preview-tasks.md#november-6-follow-up-feedback) supersede the
earlier readiness checkpoints below. The explicit Binding adoption merged through #1903 as
`4a196d9f05`, with the same tree as reviewed `3d3eb8998e`; the new initializer, acquisition and testing follow-ups are separate work.
The source/emitted/relocated consumer gate and all eight existing compiler
workloads pass without budget changes. Focused application and UI verification,
installed packed SSR consumers in three browsers and the scaffold smoke test
pass. The implementation passes independent review at `29b3f80e40`.
The final normal pre-push gate, exact-commit review and protected integration
remain requirements for the selected release candidate.

The [fresh rendering comparison](preview-followup-20261106/rendering/README.md)
retains all 64 samples across two batches. Optimized medians are 216.7/284.6 ms
and 180.7/254.6 ms; all 16 optimized pairs are slower. Host load, reported free
memory and sample ranges limit both percentages (+31.33% and +40.90%); neither
is a stable regression estimate. Added
gzip costs are 47,884/48,511 bytes. The earlier rendering comparisons below
retain their dated scope.

Daybreak is held for this additional feedback. Do not act on the older pending
authorization card for `3d3eb8998eeced834d4a7fa1810f72179796a3c3`. A later approval
must cover the final integrated source. Publication is separately held, and
`90746b32d2ca` remains the verified published snapshot. Rendering and bundle
review still require the final candidate's evidence; earlier measurements below
are historical comparisons rather than acceptance of the new candidate.

## November 6 preparation

The [current release review](preview-release-review-20261106.md) supersedes the
November 5 summary. The implementation is integrated into
`codex/layers-and-submodels` as `253cf72ed47ead5ee5a46e2530e10dcbaa1283e7`,
with its pull request and protected merge-group checks passing. Its tree is
identical to the reviewed Daybreak candidate `50d8e5f375`. The
[original security report and receipt](daybreak-20261106/README.md) preserve the
static review's scope and limits. No substantiated new security finding or
release-blocking correctness defect required a source fix.

The published Ready snapshot remains `90746b32d2ca`; no replacement has been
published or deployed. The documentation follow-up refreshes both migration
paths, the release description and the handoff. It changes no framework or
application behavior. Freeze the preview branch's full final SHA after those
changes pass review and protected integration; a development-branch commit is
not the publication target.

### Before publication approval

- Review the [changes since the published preview](preview-release-review-20261106.md#changes-since-the-published-preview),
  migration guides and [prepared PR text](preview-pr-next-release.md).
- Review the remaining rendering and bundle costs: main/candidate medians are
  637.1/672.8 ms naive and 207.2/269.4 ms optimized, with 45,201/45,848 added
  gzip bytes. The single-checker compiler measurement approval does not accept
  these runtime costs.
- Review the [two moderate build-tool advisories](layered-constructor/dependency-advisories/README.md).
  The fresh audit has no high or critical findings; it is not a clean audit.
- Refresh relevant issues, PRs, review replies and main synchronization once
  more at the final freeze. Only #1662 and #1663 have an explicit post-main
  deferral.
- Retain separate user approval for publication. All preparation and integration
  above leave that hold in place.

### After publication approval

1. Select the frozen full preview-branch SHA. Dispatch the existing Release
   workflow on `codex/layers-and-submodels` with `published_commit` equal to
   that exact ref and checkout. [Dispatch boundary](preview-release-dispatch.md).
   Ordinary pushes do not publish or deploy.
2. Verify the workflow-produced package manifest and all nine registry package
   versions, coherent dependencies and peers, and installed consumer acceptance.
   Keep local packed-fixture results separate from registry verification.
3. Verify the matching immutable Website deployment, its same-origin
   `preview-release.json`, source identity, embedded examples, migration pages
   and browser behavior.
4. Generate the Ready section through `scripts/preview-release-manifest.mjs
summary` using the actual manifest, full source SHA and observed immutable
   HTTPS deployment. The generator supplies exact versions, all three starting
   paths and both agent prompts. No version or deployment URL is assigned
   during preparation.
5. Replace #1655's preparation section with the generated Ready section and
   prepared change summary. Preserve the prior verified snapshot and user prose;
   read the result back to check source, versions, links and prompts. Complete
   any separately authorized application migration and announcement handoff,
   then record the publication receipt.

Earlier sections below retain their dated checkpoint scope. Their older
publication mechanics and performance dispositions do not supersede this
section or the current dispatch instructions.

### Fresh feedback after the reviewed snapshot

[#1897](https://github.com/foldkit/foldkit/issues/1897) reproduces on the preview:
DevTools follows an Effect Chunk's circular internal fields and overflows the
stack. The preparation branch includes Wayne Maurer's
[#1899](https://github.com/foldkit/foldkit/pull/1899) fix, preserving the original
commit and author, plus a separate nested-secret and reference-sharing
regression. The documentation-only follow-up above does not itself change
behavior; this later DevTools fix does. Its separately authorized
[Daybreak addendum and artifact verification](daybreak-20261106-addendum/README.md)
are complete, with no substantiated new security or release-correctness defect.
The rebuilt production benchmark artifacts are byte-identical to the previously
measured workloads; their existing timing and gzip results remain applicable.

The new [profiling proposal (#1898)](https://github.com/foldkit/foldkit/pull/1898)
is assessed separately and is not included. Canonical Block-aware Scene already
preserves its boundary registry and supports `unhover`. Native Scene registry
parity remains outside this change; the proposed profiling APIs need their own
acceptance, Program/Block integration and lifecycle/timing design. This is an
unaccepted proposal, not an agreed deferral or implemented release feature.

## November 5 checkpoint

The [November 5 review](preview-review-20261105.md) records changes since published
preview `90746b32d2ca`, verification, remaining review items and publication holds.
It includes the repository-wide convention and Story/Scene migration, preserved
user edits, incoming Node/Scene/Menu/DragAndDrop/Query contributions, and Dialog
terminal-cleanup and public provider-declaration repairs. Earlier sections below
retain their dated checkpoint scope.

## November 4 checkpoint

The last verified publication remains `90746b32d2ca`; this candidate is not
published. The [unified adoption report](block-api-simplification/adoption-20261104.md)
owns the current verification and integration status.

Changes since that publication include:

- One passive `FooBlock = Block.make(...)` carries the public contracts and
  typed authoring helpers. `FooBlock.makeLayer(...)` returns an ordinary Effect
  Layer; Program, Server, Story and Scene select `{ block, layer }`.
- Effectful graph construction retains portable init, update, view and Binding
  expressions, deferred child initialization and Model-owned lifecycles.
- Separate InMessages and `makeInMessageUpdate` share checked ordered
  composition with local updates. Exhaustive handler records remain the default.
- Standard child arrays can use ready Instance Schemas and passive Binding
  creation requests, demonstrated by Counters.
- Main's Effect 4.1 integration and preview feedback repairs cover Mount cleanup,
  SSR development identity/reloads, embedding disposal, DevTools and VirtualList.
- Examples, Website, Typing Game, UI/Query families, scoped tests, scaffolds,
  active guidance and lint recognition adopt the same construction model.
- The [attribute typing adaptation](pr1882-preview-adaptation.md) preserves
  child Mount capabilities and reduces compiler work for shared attribute bundles.

Machine authoring, Query cache/cancellation capabilities and the earlier
VirtualList additions already shipped in the October 29 snapshot. Their factory
and construction migrations here are not new versions of those features.

The complete repository pre-push gate, all 22 Website browser tests, installed
packed consumers in Chromium/Firefox/WebKit, original compiler fixtures and
retained adapted workloads pass. The corrected foundation and migration commits
pass exact independent review. The final
[rendering comparison](block-api-simplification/rendering-20261104/README.md)
records a 10.42% naive and 29.69% optimized execution-time increase against actual
main, plus 43,981/44,615 gzip bytes. All 64 samples from both batches remain.
The bounded Mount-validation bookkeeping trial preserves all checks but does not
establish an optimized speedup. These runtime and bundle costs need review;
the user's compiler-cost acceptance does not accept them. The migration is
pushed through `9c276260f9` in [PR #1883](https://github.com/foldkit/foldkit/pull/1883).
Its [standalone fixture follow-up](block-api-simplification/execution-fixtures-20261104.md)
passes all 87 browser cases with the original 21 skips, the resize-readiness
negative control, source checks for 16 fixture modules and 188 plugin tests.
Exact review and required checks precede integration; the adoption report records
current status.
PR #1883 subsequently merged as `44e94feeba0e` with an identical reviewed tree
and all required checks passing. The authorized Daybreak review of that commit
completed with no substantiated new security or release-blocking correctness
finding. The user requested both non-blocking
[hardening improvements](daybreak-hardening-20261104.md); their implementation
retains a separate verification and review scope. Publication remains held.
Only #1662 and #1663 have an explicit post-main deferral.

## October 30 stabilization follow-up

The [current feedback pass](preview-feedback-stabilization-20261030.md) repairs
Binding startup allocation and VirtualList external offset anchoring, and
reconciles the Work Orders diagnostics and guidance. It starts from reviewed
`9964c056` on the isolated main-sync branch. Integration gates pass;
the exact committed diff requires independent review before pushing. The
published Ready snapshot below remains unchanged.

## Published October 29

The approved preview is published from
`90746b32d2ca8bc0476de7a051ace396ca590ae0`. Its complete public package cohort,
immutable Website, installed consumers, PR Ready entry points and actual
Coverchart upgrade are verified. See the
[publication report and receipt](preview-publication-20261029.md) for the
matching links, recovery, checks and retained limits.

PR #1655 remains open against main. The user explicitly deferred #1662 and
#1663 until after that merge. The following preparation sections preserve
their original status, source pins and approval holds as historical evidence;
they do not override this completed publication.

## Approved follow-up after the frozen review

The user requested adoption work for Model-aware general `makeStep` Message
inference and `Scene.unhover` after the `564adb49e9` review. These are currently
implemented and verified in source, relocated declarations and paired editor
workflows. [Follow-up evidence](step-inference-unhover-20261029.md). The exact
`d35d3ceb7a` follow-up now passes independent review, an approved Daybreak
addendum and a fresh nine-package build/pack rehearsal. [Final scope and receipts](preview-followup-final-20261029.md).
Earlier full installed-app and browser results retain their source pins.

The user explicitly deferred #1662's OutMessage propagation and #1663's derived
view slots until after Blocks + Effect Layers merges to main. Neither is a
requirement for this preview. Publication remains held for separate approval.

## Current release documentation scope, October 28

Include Machine, Query/KeyedQuery and VirtualList in the next preview update,
PR release notes and announcement handoff. The user has superseded the earlier
instruction to omit VirtualList from the PR description and next X post.

The next preview also standardizes generic UI Block factories as `makeBlock`.
Selection components and VirtualList replace `create`; Toast replaces `make`.
Type parameters and Schema arguments remain unchanged. Include this required
rename in the upgrade instructions for affected consumers.

Effect peers accept the tested `4.0.0 || 4.0.6` versions, covered by packed
consumer compatibility checks. Unverified releases are excluded; development
and application pins are unchanged.
The Node adapter also pins platform-node-shared 4.0.0 to preserve the Effect
floor. [Platform constraints and evidence](effect-peer-compatibility-20261028.md).

Active source, examples, scaffold templates and guidance now use same-named
decoded type aliases immediately after their Schemas. This is an authoring
convention, not a required consumer API migration. Schema arguments retain
`typeof Foo`, and generic or recursive contracts retain their precise types.
[Repo-wide adoption and verification](schema-type-alias-adoption-20261028.md).

Machine's Schema-bound Definition and checked completion test authoring
consistency with Blocks. Query/KeyedQuery lifecycle capabilities and VirtualList
history, external scroll ownership and layouts are additional features carried
on this branch for `foldkit-domains`; they are not prerequisites for adopting
Blocks + Effect Layers. The domains application migration remains separate.

The [preview upgrade guide](../packages/website/src/page/previewUpgrade.md#upgrade-from-f3be22cfeefe)
covers the new APIs and affected migrations. Detailed implementation and
verification are recorded in the [Machine report](machine-authoring-20261027.md),
[VirtualList report](virtual-list-preview-integration-20261027.md) and
[Query report](keyed-query-capabilities-20261028.md).

The [October 28 feedback integration](preview-feedback-integration-20261028.md)
adds contextual update inference repairs, large-Root registration-evidence
extraction, SSR development reload/disposal, renderer-aligned Scene Mounts,
Runtime cleanup and entry-owned Subscription gates/activity assertions. The
mixed-result inferred-`any` report remains unconfirmed after bounded regression
probes; do not announce it as fixed or close it from this evidence alone.

The [final preparation](preview-final-prep-20261028.md) repairs the Website's
Playground declaration collection and lazy loading, verifies ordinary development
SSR, and records the bounded inferred-`any` disposition. The final nine-package
consumer rehearsal and Website checks pass at reviewed source `564adb49e9`.
The [completed Daybreak review](preview-daybreak-20261028.md) returns PASS for
that same source after the user approved the transfer. Dependency findings and
review limits remain explicit. Publication awaits separate release approval.

Publication stays held for approval. Preserve the PR's three starting paths,
user-authored content and verified Ready snapshot. Link the updated guide to
the matching verified deployment when publishing the next preview; local
documentation changes do not advance the published snapshot.

## Current stabilization preparation, October 27

The subsequent [Message-only Step adapter](message-step-adapter-20261027.md)
adds optional `makeStep.fromMessage`, repairs invalid-union validation in both
general Step forms, and migrates the two eligible consumers. Its source,
declaration, runtime, lint, compiler and editor evidence supplements the earlier
release checkpoints. Publication and integration remain held for approval.

The [SSG stabilization addendum](preview-stabilization-1811-20261027.md) owns
the latest #1811 repair at `f15fa164624130f1773be20aac9090a9d1e2a9dc`,
with affected source, packed-plugin, browser and review verification. The
[preceding summary](preview-stabilization-final-20261027.md) retains the full
change inventory and 93c source/performance evidence. The late #1810 report is assessed:
preservation recovery and paired troubleshooting examples are implemented;
missing-handler diagnostic priority remains a disclosed limitation.
Publication and release-branch integration remain held for approval. The
published snapshot below remains current; older preparation sections retain
their historical source pins and states.

## Verified published snapshot

The published snapshot is `f3be22cfeefed437164ad614d08b16d9000e0703`.
Its authoritative nine-package manifest, immutable Website, actual Coverchart
upgrade and retained qualifications are recorded in the
[October 26 publication report](preview-publication-20261026.md). The generated
PR #1655 handoff is posted and read back after this evidence commit.

The release was integrated only into `codex/layers-and-submodels`; Foldkit
`main` was not changed. Sections below preserve their original preparation
state, local artifact labels and evidence pins. They are historical context,
not current installation instructions.

## Historical preparation checkpoint

Use the [October 26 approval summary](preview-approval-20261026.md) for frozen
implementation `f5506b7e240a4d8987338f22427a2bd1ecdf9cb5` and local package
source digest `b8b162accc756093e0516fbc0d0c12378915370b2eb680514d377fc0086f2abe`.
Its [fresh nine-package rehearsal](preview-final-hardening-20261026.md)
covers Subscription organization, runtime optimization, duplicate-Mount rejection
and the customization guide. Source/emitted
contracts, all six unchanged compiler controls, runtime/lint checks, installed
Coverchart, all three scaffolds and 32 Workspace browser cases pass. The earlier
53-script sweep retains its `978c07a093` pin and is supplemented by affected
checks for the subsequent code. Recorded generated seed files and local package
labels qualify the package-source digest.

Publication remains held for user approval. Published Ready stays `1f6776fa7ece`;
main and preview integration are unchanged. The [runtime investigation at fa96](preview-runtime-investigation-20261026.md)
reduces optimized workload time by 12.7% in six paired rounds; that screen is 22.0%
above main, with naive performance effectively unchanged and about 32 KB of
additional gzip. The [earlier published-preview control](preview-lustre-20261026.md)
retains its own source and timing scope. No absolute times are pooled across
batches. No new rendering timings are claimed for f550. [Daybreak's full-delta PASS](preview-daybreak-20261026.md),
[hardening addendum](preview-daybreak-hardening-20261026.md) and the
[new feedback assessment](preview-feedback-20261026.md) record inherited limits
and open integration proposals. The final Website production build passes;
subsequent internal evidence edits preserve f550 package inputs. Detailed advisory and review scope lives
in the [approval summary](preview-approval-20261026.md#feedback-and-security).

Keep the three consumer starting paths and current Ready instructions. After
approval, assign the published source/package map and matching immutable
documentation deployment, then generate the two migration prompts and exact
scaffold command from that verified manifest. Update actual Coverchart against
the published set. Local tarballs are preparation evidence, not installation
instructions. Historical tables below retain their own pins and scopes.

## Subsequent followups after 679d2d5e7f

The headless `foldkit/test` wrapper, concurrent Story delivery, exact whole-variant
Binding helper and extracted-input assessment are complete. Auth and eligible
parent Stories are migrated. The complete current delta and its final evidence
are recorded in [final followups](preview-final-followups-20261025.md). The
`679d2d5e7f` tables below remain their earlier checkpoint. The subsequent frozen
source `d7d06ee6c4d7…` passes fresh nine-package installed acceptance, Coverchart's
40 tests and build, all three scaffold modes, four installed contract tests and
current native measurements. Exact artifact identities and limitations are
linked from the final report. Internal evidence addenda do not alter packaged
sources. The actual Coverchart repository remains preserved.

Fresh Website Binding hover/completion measures 239/227 ms; Workspace Block
completion measures 790 ms with sampled server RSS near 578 MiB. A bounded
same-session cold-root comparison measures 2.95 seconds for exact `679d2d5e7f`
and 2.92 seconds for the followups, with overlapping ranges. This demonstrates
no material incremental regression; roughly three-second cold root access
remains a limitation. No new runtime or browser timing is claimed.

An inherited explicit Mount-argument erasure limit is documented. The direct
internal registry guard is hardened, while a name-preserving alias with `any`
args may still pass generic call inference. Keep precise/inferred registries;
this is not a universal static guarantee after erasure. Publication remains held.

## October 25 candidate verification

The subsequent [Workspace assembly cleanup](workspace-clean-assembly-20261025.md)
removes its extra implementation interface while retaining actual whole-root
emission and strict relocation. Framework artifacts are unchanged. The existing
Binding tuple type is exported for cross-module declaration reuse; `block.ts`
still exports only the Block. Its 110 declarations now total 12,420,362
bytes. Three alternating native pairs measure completed-Block post-edit
completion at 840 ms for the earlier header and 57 ms for ordinary assembly.
Other workflow ranges overlap, and all five compiler counts remain unchanged.
The table below retains the earlier candidate's verification scope.

The final framework migration is integrated and independently reviewed. `Composition.makeUpdate` is record-only; all three focused Step helpers take producer callbacks and expose `.fromMessage`; owned all-attached ManagedResource registries expose `.layer`. All examples, Website, Typing Game, UI and scaffolds were inspected for adoption, including working sites eligible for the conveniences. [Adoption and intentional exceptions](preview-api-adoption.md).

| Gate                    | Result                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Source                  | All 53 configurations pass with stable framework source/artifact hashes                                                     |
| Public contracts        | Core and UI external emission, rejection and strict relocation pass                                                         |
| Independent safety      | Actual Room context inference and 28 adversarial return-channel controls pass                                               |
| Workspace serialization | 110 declarations, 11,452,935 bytes; exact private boundary and strict relocation pass                                       |
| Compiler ceilings       | All five pass twice, unchanged                                                                                              |
| Runtime                 | Core 3,700 with one skip and coverage gates; UI 1,298; Website 1,480; lint 622; Vite 331 with three skips                   |
| Application behavior    | 270 focused tests including Workspace 160; full Workspace browser suite 32/32                                               |
| Installed consumers     | All nine packages packed; Coverchart and SPA/SSG/SSR source/lint/tests/builds pass                                          |
| Browser rehearsal       | Five Coverchart persistence/keyboard behaviors and all three scaffold modes pass without page errors or warnings            |
| Security                | Independent static delta review reports no new blocker; existing audit findings retain their documented reachability limits |
| Final measurements      | Three alternating native pairs, three Workspace runs and four rotating runtime rounds pass; costs are disclosed below       |

The exact core delivery declaration is `858da5e8a66bbee998271a80cc73ce645dc64c3f1970d740c683f86712df3c80`. Its final inference encoding preserves the prior runtime programs. Independent review rejected unsafe intermediate union encodings; their passes are not release evidence. [Final review](/private/tmp/foldkit-independent-review-final-20261025.json). The private Workspace boundary fixes its actual TS7056 failure; the unannotated control and separate 32-group synthetic serialization limit remain explicit. This is not an editor-speed claim.

The local nine-package artifact snapshot is `f5277e87…`; the rehearsal records its full digest and installed package identities. Subsequent proof, naming, documentation and formatting changes are captured in its post-freeze addendum. Final artifact comparison confirms identical runtime/API contracts; maps and nonsemantic source differences are recorded separately. The source/declaration-map packaging limitation predates this migration. [Local rehearsal](/private/tmp/foldkit-inclusive9-rehearsal-20261024/rehearsal-plan.json). The actual Coverchart repository remains unchanged at `c51e856b2e75ca44106e37ead24f9c4e8046aef0`, with all 88 tracked file hashes and concurrent untracked content preserved.

The final source sweep includes the internal benchmark and Vite fixtures that its first run found using removed callback/no-argument forms. TodoMVC uses its existing exhaustive record directly. Three dedicated Typing Game handlers now follow `handle<MessageTag>` naming without changing their argument contracts. The Vite suite uses loopback-enabled execution; the sandbox-blocked run is excluded. Website uses the pinned cached pnpm; its stalled default-Corepack attempt is excluded. No timeout or compiler ceiling was increased.

## Historical release status and boundary

This checkpoint predates the current manual-dispatch publication gate. Use the
November 6 procedure above for the next release.

Published Ready remains `1f6776fa7ececa766188df5201eefec6ba781b5d`. Final preparation does not promote that snapshot. Publication is held for the user’s approval, and preview integration targets `codex/layers-and-submodels`, never `main`.

The working source is on `codex/workspace-example`, based on `31d8aad9fe4555112b3cf8e2d948badeee9ced0d` with concurrent changes included. The candidate is committed locally; the published integration commit, registry package map, and immutable deployment have not been assigned. Pushing the preview integration branch triggers canary publication, so no integration push, merge, publication, actual Coverchart migration or external PR release promotion is performed during preparation. Development-branch commits and pushes remain separately authorized.

The historical checkpoint sections below retain their own dates, artifact identities and scope. Their older results do not supersede the October 25 candidate gates. Keep the existing working Ready instructions available in [PR #1655](https://github.com/foldkit/foldkit/pull/1655) until the replacement passes publication/deployment gates.

## Final performance disposition

The [final benchmark](preview-framework-performance.md#october-25-final-candidate) compares the candidate with published `1f6776fa7ece` using identical native TypeScript drivers and a quiet timing window. Website hover/completion/definition are broadly similar; error appearance/clearing add about 56 ms and cold root Message access adds about 350 ms (2.45→2.80 seconds). Workspace measures 266 ms hover, 260 ms Binding completion, 773 ms Block completion, and 198/179 ms diagnostics, with a bounded sampled peak near 580 MiB. No same-graph historical Workspace or long-session memory guarantee is claimed. Independent review accepts these explicit preview costs.

Four rotating runtime rounds pass correctness, with observed median increases of 2.3% naive and 6.7% optimized and overlapping ranges. JavaScript adds 7,564 raw bytes and about 1.6 KB gzip. This is a bounded screen, not proof of zero overhead. No timeout or compiler ceiling was increased. The optional tsrs guide describes a separately tested editor option, not a prerequisite or proof that native latency is solved.

## Changes since the published preview

Use `1f6776fa7ece` as the previous-preview baseline. It already uses `Composition.prepareBlock`, checked `Block.assemble(prepare)` exports, `Definition.make*` authoring factories, and `Program.make` or `Program.makeElement`. Those APIs do not need another rename.

### Required migrations

- Replace collection-taking `Definition.makeCommandsStep(commands)` calls with a callback. Use `() => commands` or a Model callback when Command arguments depend on the applied Model. The collection overload is removed.
- Replace callback-taking `Composition.makeUpdate` with an exhaustive Model-first handler record. Use `makeUpdate({})` without local Messages and `.withContext(context => handlers)` for dispatch context. Pass compatible extracted `handle<MessageTag>` handlers or Steps directly; keep callbacks for payload adaptation, derived inputs, or necessary contextual inference. No callback compatibility overload remains.
- Replace value-taking `Definition.makeOutMessageStep(value)` with `Definition.makeOutMessageStep(() => value)`. Ordinary producers can also read the Model and exact Message; all three focused helpers expose `.fromMessage` for payload-only producers. No value overload remains.
- Reserve the ManagedResource registry key `layer` for the owned aggregate; rename an existing resource entry with that key. Mixed/host-owned registries require explicit entry providers. The temporary `ManagedResource.handlersLayer` helper has no alias.
- Handle the new DragAndDrop `StartedKeyboardDrag` and `ChangedKeyboardTarget` variants in exhaustive OutMessage policies. The installed Coverchart rehearsal explicitly checks this migration.
- Preserve connected result channels. An individual handler mixing raw local results with connected Binding recipes must use Definition-owned Steps for its local branches. The exhaustive record separates unrelated local handlers, while mixed branches inside one handler still need a precise result contract.
- Repair compositions that discard an operation's parent OutMessage. Retain the complete result or handle the OutMessage through an appropriate registered policy. `Update.combineSteps` continues to combine Steps without emitting OutMessages; it does not sequence Command execution.

Raw-only handlers can return results directly; they do not require a Step wrapper. A previous-preview application does not need to rebuild its child graph or change its ordinary checked assembly exports.

### Behavior and correctness fixes

- Per-Message handler records preserve an exposed operation's own Commands, requirements, and OutMessages. A silent operation can compose without inheriting an unrelated emitting handler's aggregate contract.
- Connected-Step checks preserve deferred policy evidence and reject the demonstrated channel-loss cases at authoring boundaries. They do not recover channels already erased by an inaccurate upstream annotation or claim universal prevention of TypeScript width erasure.
- Named public UI headers and named update interfaces reduce repeated declaration expansion without changing runtime scheduling. Source, emitted-declaration, registration, identity, and lifecycle checks remain release gates.
- Effect DateTime/TimeZone values are accepted in nested ViewInputs while added application callbacks remain rejected. `Update.withOutMessage` retains its OutMessage after homogeneous and nested connected Step combinations. These fixes require no new API names or data conversions.
- The new Workspace example exercises a larger graph with retained issue drafts, shared canonical data, optimistic board placement, asynchronous failures/retry, comments, saved views, and keyboard interactions. Its controls share an application-owned Tailwind style system. All single-selection controls use Foldkit UI Listbox. Board cards use pointer and keyboard drag handles without duplicate status selectors or arrow buttons.

### Optional conveniences and tooling

- Adopt focused field, Command, and OutMessage producers where a handler has one responsibility. Use `.fromMessage` for payload-only producers, Model-aware callbacks when needed, and direct compatible Steps as handlers. Keep cohesive mixed transitions as direct results. Converting existing collection/value arguments is required; downstream adoption at other working sites is an organization choice. The in-repo migration audits those sites explicitly.
- Derive Record/HashMap child storage with `makeMapBinding` when the parent actually stores children by primitive key. Do not convert domain caches or a single child's whole Record/HashMap Model into child collections. Closed, all-attached owned ManagedResource registries supply `.layer`, matching Subscriptions, with `Layer.empty` for empty registries. Explicit Command Layers remain the assessed contract. Identity-based `Story.Command.argsOf` and `Scene.Command.argsOf` inspect public Commands without requiring name matching or deep imports of private child definitions.
- Recommend trying the documented tsrs editor setup for large compositions while retaining official TypeScript for repository checks and CI. It improved the user's Neovim experience; it remains optional and experimental, with remaining latency and measurement limits stated in the guide.

Do not carry earlier preview factory renames into this delta as though they were new. The [previous-preview upgrade guide](../packages/website/src/page/previewUpgrade.md) selects the correct section from the installed package and lockfile versions.

## Three consumer starting points

The eventual Ready section must present these three paths near the top, beside the verified source commit, immutable website deployment, and its same-origin `preview-release.json`:

| Starting point                         | Target guidance                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Existing stable Foldkit application    | Complete `/preview-migration` guide on the verified target deployment          |
| Application using the previous preview | Shorter `/preview-upgrade` guide, starting with its installed snapshot section |
| New project                            | Exact scaffold command generated from the verified target package manifest     |

Identify the installed API from `package.json` and the lockfile, not the application's Git branch. Update only installed Foldkit packages, preserve dependency/devDependency placement, and align all versions to one verified manifest. Use the same deployment for guides, snippets, prompts, the editor tooling link, and package metadata.

The [stable migration guide](../packages/website/src/page/previewMigration.md) and [preview upgrade guide](../packages/website/src/page/previewUpgrade.md) are prepared source. Their future public deployment URL must come from the verified website workflow. Do not substitute the moving preview hostname or invent an immutable URL.

## Local verification evidence

The [October 24 artifact refresh](/private/tmp/foldkit-feedback-refresh-20261024/report.md) records all nine freshly built packages, exact coherent local versions, installed provenance, and public source/emitted-declaration checks. The [incremental verification report](preview-type-feedback-20261024.md) records the new regression proofs and native benchmark. The following preceding rehearsal remains the runtime/browser checkpoint; its results are transferred through the byte-identity comparison below.

The [complete preceding local rehearsal report](/private/tmp/coverchart-next-preview-rehearsal-20261023/final-report.md) records its scope and limitations. Supporting evidence:

- [Frozen source files and hashes](/private/tmp/coverchart-next-preview-rehearsal-20261023/candidate-source-v3.json).
- [All nine package manifests, tarball hashes, integrity, and local versions](/private/tmp/coverchart-next-preview-rehearsal-20261023/artifacts-v3.json).
- [Installed Coverchart package coherence and original-repository preservation](/private/tmp/coverchart-next-preview-rehearsal-20261023/final-installed-provenance.json).
- [Coverchart source migration patch](/private/tmp/coverchart-next-preview-rehearsal-20261023/consumer-source.patch), independently reviewed by the integrating agent.
- [Coverchart production-browser migration checks](/private/tmp/coverchart-next-preview-rehearsal-20261023/final-local-migration-risks-browser.json).
- [Generated SPA/SSG/SSR source, lint, test, and build results](/private/tmp/coverchart-next-preview-rehearsal-20261023/scaffold-gates.json).
- [Generated production-app hydration and routing checks](/private/tmp/coverchart-next-preview-rehearsal-20261023/scaffold-browser.json).

All nine public packages were rebuilt and packed from that preceding frozen source. Its final 556-file production comparison is retained with its original identity: [source comparison](/private/tmp/foldkit-next-preview-benchmark-20261023/final-production-provenance.json). Coverchart installed its existing six packages through local tarballs, retained dependency placement, and passed source checks including tests, lint, 40 tests, production build, and the legacy-data/persistence browser checks. Its actual repository remains unchanged at `c51e856b2e75ca44106e37ead24f9c4e8046aef0`; all 88 tracked file hashes and its preexisting untracked `.claude/` directory were preserved.

The packed CLI generated SPA, SSG, and SSR projects. Each passed source checks, the complete shipped lint script, tests, production build, and independent browser checks. Test totals were 10, 2, and 2. The SSG local installation needed a temporary localhost metadata fixture for an unpublished UI peer; that fixture served the exact packed artifact without adding an app dependency. No package was published, and this is not registry acceptance.

For the October 24 refresh, all nine packages were rebuilt as `-local.f89c6afa2fb1` and reinstalled into those four isolated consumers. All four source checks, including test source, pass. DateTime and combined-OutMessage accepted/rejected cases emit and relocate against installed public package entrypoints with `strict: true` and `skipLibCheck: false`. All 449 production JavaScript files and 709 CLI source templates are byte-identical to the preceding tested artifacts. The prior runtime tests and browser suites are transferred evidence, not rerun results. Packed differences are release metadata plus `viewInputs.d.ts` and its map; final fixture-only corrections are preserved separately in the refresh report.

The [final post-change benchmark](./preview-framework-performance.md#final-post-change-benchmark) is complete. It records the residual Website editor costs, the bounded four-round runtime screen, and unchanged compiler ceilings. The completed static security review and broader local checks are recorded below. Keep the residual limits and approval gates in [next preview tasks](./next-preview-tasks.md). A private application's successful `noEmit` check must not substitute for required source and emitted-declaration safety checks.

## October 23 verification checkpoint

The release lead confirmed these results for the October 23 source checkpoint. They supplement the packed-package rehearsals and do not establish published-package acceptance or promote Ready:

| Gate                  | Confirmed result                                                               |
| --------------------- | ------------------------------------------------------------------------------ |
| Source configurations | All 53 pass                                                                    |
| Core runtime          | 3,659 pass, one intentional skip; 187 passing files and one skipped file       |
| Core coverage         | Statements 91.07%, branches 85.15%, functions 89.41%, lines 91.34%; gates pass |
| UI                    | 1,295 tests, 66 files                                                          |
| DevTools              | 6 tests, 2 files                                                               |
| Workspace             | 111 tests                                                                      |
| Website               | 1,471 tests, 38 files                                                          |
| Canonical lint plugin | 577 tests, 37 files; fixture typechecks pass                                   |
| Release workflow      | 18 tests                                                                       |
| Changeset ignore      | Pass                                                                           |
| API generation        | No errors; 266 retained external Effect/TypeDoc link warnings                  |

Evidence: [source-check summary](/private/tmp/foldkit-next-preview-source-checks-20261023.json), [source-check log](/private/tmp/foldkit-next-preview-source-checks-20261023.log), [core log](/private/tmp/foldkit-next-preview-tests-core-20261023.log), [UI log](/private/tmp/foldkit-next-preview-tests-ui-20261023.log), [DevTools log](/private/tmp/foldkit-next-preview-tests-devtools-20261023.log), [Workspace log](/private/tmp/foldkit-next-preview-tests-workspace-20261023.log), [Website log](/private/tmp/foldkit-next-preview-tests-website-20261023.log), and [canonical plugin log](/private/tmp/foldkit-oxlint-canonical-after.log).

The [final static security review](./next-preview-security-review.md) includes the two-interface repair and establishes no new release-blocking code vulnerability. It is not a new Daybreak run or certification. The fresh dependency audit remains **1 Critical, 8 High, 11 Moderate, and 4 Low**, with the report's concrete reachability limits and maintenance followups retained. The release lead kept that dependency checkpoint for this candidate; do not describe it as a clean audit or a patched Monaco sanitizer. [Raw audit](/private/tmp/foldkit-next-preview-audit-20261023.json).

The real Workspace root emits 80 declaration files after the internal repair and passes strict relocated accepted/rejected checks. The separate 32-group aggregate-operation root retains TS7056. Final native/editor/runtime measurements are recorded in the linked report. Independent review accepts the disclosed preview tradeoff: Website cold root-Message access adds about 470 ms and error clearing about 100 ms; Workspace workflows remain responsive in the measured bounded sessions. The four-round runtime screen shows no demonstrated material regression. None of this replaces the user's publication approval or the postpublication registry/deployment gates.

The subsequent October 24 followup independently passes all 53 source configurations, 132 focused core runtime tests, full core/UI external declaration harnesses, focused lint, and all five unchanged compiler ceilings with identical counts. Three alternating paired native runs show no material incremental regression. Its bounded independent review found no blocking issue. [Current verification, exact scope, mutations, and limitations](preview-type-feedback-20261024.md). Production JavaScript and dependencies are unchanged; the existing security disposition remains in effect, without claiming a new Daybreak run or clean audit.

## Historical release sequence

These steps retain the older automation assumptions. Follow the current
[manual dispatch procedure](preview-release-dispatch.md) and November 6 section
above instead.

Local verification and review precede final approval. The candidate remains unpublished until the user approves release.

1. **Obtain approval and freeze the reviewed source commit.** Present the completed local performance, declaration, lifecycle, security, and consumer evidence, including the remaining limitations. The local candidate commit receives independent review before handoff. After the user approves release, identify the exact integration release commit. Any subsequent concurrent edits need their own scoped verification and review before inclusion. If production source changes after the recorded snapshot, refresh affected package and consumer evidence.
2. **Integrate only into the preview branch.** Follow the authorized commit/push/merge instructions for `codex/layers-and-submodels`, never `main`. Its Release workflow publishes canaries on an integration push, so treat that update as the publication boundary. Keep the replacement labelled “Next preview in preparation” while verification runs.
3. **Verify the actual published package set.** Use the workflow-produced manifest for that exact commit. Check all nine packages and their coherent peer/dependency versions, constructor and handler contracts, and published declaration entrypoints. Repeat the installed-package Coverchart and scaffold acceptance against those registry versions. The local `-local.*` labels and fixture URLs must never enter the public handoff.
4. **Verify the matching immutable website deployment.** Confirm its banner, embedded example build identities, guides, snippets, and same-origin manifest identify the same source commit and package map. Use the existing manifest `verify` and `verify-build` commands with the actual workflow manifest, release commit, and built website directory.
5. **Generate the release section.** Invoke `scripts/preview-release-manifest.mjs summary` with the verified manifest, full release commit, and immutable HTTPS deployment. It calls `previewReadySummary` and emits the exact scaffold command, package map, editor guidance link, three starting paths, and two expandable agent prompts. Use that output instead of maintaining another prompt template. Its `GITHUB_STEP_SUMMARY` output path is a local staging file during handoff preparation.
6. **Update PR #1655 after all release gates pass.** Replace the prepared release section with the generated Ready summary. Add the concise required/behavior/optional delta from this handoff. Preserve the existing feature overview and user-authored content below it, and retain a link to the previous verified snapshot. Read the PR back to check its title, body, links, exact versions, scaffold command, and both prompts. Do not put AI attribution in its title or description.
7. **Complete the actual consumer update and announcement handoff.** Once the approved published target exists, update the actual Coverchart repository under the user's authorization and verify its source, tests, lint, build, and browser behavior. Provide the exact Ready source, deployment, manifest, migration links, and remaining limits for the user's announcement. Publication approval must not be inferred from local preparation.

The stable and previous-preview agent prompts must continue to carry the exact target commit, package map, manifest URL, and guide URL. The optional editor setup remains tooling guidance, not a fourth migration path.
