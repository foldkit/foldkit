# Local construction and InMessage security review

The initial review inspected the runtime-facing changes from `be0cb38108693068da30eb835e6eb33d6d5762c8` before the first local commit, including newly added framework modules. The subsequent exact-commit review and corrected candidate are recorded below.

## Result

The required exact-commit review of `7964029296e79389bc1bf55ac2cdf3b08e036c2e` subsequently found two candidate-only contract gaps: foreign Definition plans could pass erased runtime completion, and family declarations omitted input-configuration type validation. Follow-through review of the first fix found that rereading an init accessor could still substitute a foreign plan after authentication. The candidate now authenticates and compiles one body snapshot, and all three findings have the checks recorded below. The initial 35-advisory dependency snapshot remains recorded as historical evidence. Subsequent dependency stabilization, recorded in the final addendum, reduces the workspace audit to two moderate findings. This result is not a clean dependency audit or release approval.

The initial local review was read-only and inspected existing focused tests and receipts. No source was transferred to Daybreak and no fresh Daybreak review was performed. The subsequent candidate fixes and verification are recorded separately below. Review of the exact amended final commit remains required.

## Runtime boundaries inspected

- Original descriptor, executable, Binding connection, compiled operation, receive plan, and acquired test graph identity use private WeakMap/WeakSet registrations. A caller-shaped record or copied brand does not enroll an implementation. See `block/compiledOperation.ts`, `block/bindingConnection.ts`, `experimental/constructed/{runtime,symbolic}.ts`, `experimental/contracted/runtime.ts`, and `test/testGraph.ts`.
- `block/runtimeCapability.ts` authenticates an authority against its private registry, exact acquired implementation, active construction lifetime, active occurrence, and any current occurrence cursor. Capability keys follow the canonical owner object. `experimental/constructed/runtime.ts` resolves the authority for each Command invocation, injects that occurrence's resources, restores invocation phase, and forks the work into its Scope. A memoized handler Layer does not capture the first occurrence's resource authority.
- `runtime/compositionRuntime.ts` installs authority on actual graph occurrences. Retirement marks a node inactive before asynchronous cleanup. The existing generation guard still rejects late child results, and closure interrupts occurrence work and releases child resources. The new input path supplies no second runtime queue. Calling pure `receive` on a retained Model can compute a result after closure, but executing a returned resource Command still requires an authentic live authority.
- `experimental/contracted/inMessage.ts` requires finite, union-owned input constructors, rejects overlap with local Message tags and generated-operation collisions, checks exhaustive receive cases, and validates decoded input before running a handler. Completion requires the selected Composition's original Receive plan. Generated input methods lower through authenticated compiled operations rather than constructing local Message envelopes.
- `experimental/layered/testing/{withBlock,subject,inMessage}.ts` acquires the registered selected implementation, keeps it scoped to synchronous or Effect callbacks, rejects Promise callbacks, validates input against the selected Schema, and resolves reusable input causes separately for each test graph. Native test runners reject unresolved input causes. These helpers do not grant a general runtime input endpoint.
- `runtime/{rootBlock,programRoot,programConstruction}.ts` resolves only registered constructed roots or checked native Blocks. Program startup validates hydration handoff before graph acquisition and retains the shared provider MemoMap inside its host Scope. `experimental/server/server.ts` resolves the registered root inside `Effect.scoped`, then uses the existing native lowering, Flags encoding/decoding, document validation, and HTML/hydration handling. It does not accept InMessages from an HTTP request.

These registrations authenticate framework objects inside a trusted application process. They do not sandbox arbitrary JavaScript that already executes in that process.

## Evidence inspected

- `experimental/constructed/construction.test.ts`: independent acquisitions, child release on failed parent construction, and interruption during construction.
- `experimental/contracted/{inMessage,inMessage.review,testing,publishedMounts,viewComposition}.test.ts`: decoded input rejection, borrowed constructors, foreign Receive plans, normalized child policies, selected implementation test isolation, and original Mount/view identities.
- `block/compiledOperation.test.ts`: unauthenticated executors and same-owner/different-Composition rejection.
- `experimental/layered/testing/inMessage.test.ts`: reusable input causes, local Command-result routing, Scene pending boundaries, native-runner refusal, and separate receive Context.
- `internal/layered-constructor/runtime-capability/results.json` and its actual `app/test/runtime.test.ts`: detached execution, construction-phase resource-read rejection, typed handler failure, two direct children plus a keyed collection, shared handler MemoMap, capability-only invocation, wrong occurrence/implementation, retired keyed occurrence, closed acquisition, and socket/listener cleanup. The saved receipt also records four controlled failures. This proof uses internal runtime protocol entry points; it is not presented as a browser/SSR test.
- `internal/layered-constructor/inmessages/verification/runtime-j1RoCF/results.json`: baseline/restored success and five failing mutations for unchecked payload, input in local Codec, discarded input result, foreign Receive plan, and wrong graph policy. These are prior receipts inspected during this review, not freshly executed checks.

## Outstanding dependency findings

Input: `/tmp/foldkit-constructor-final-dependency-audit.json`. The registry query succeeded and the audit exited 1 with advisories. Its metadata reports **35 advisories: 1 critical, 12 high, 18 moderate, and 4 low**. The audit is broader than the runtime delta; this review did not establish when each dependency advisory entered the repository.

| Dependency and resolved version  | Installed path / exposure                  | Advisory evidence                                                                                           | Patched version reported by audit                                           |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| DOMPurify 3.4.16                 | Website → Monaco Editor                    | Critical [GHSA-cg2g-xh64-v4q7](https://github.com/advisories/GHSA-cg2g-xh64-v4q7), plus high/low advisories | ≥3.4.17                                                                     |
| MCP TypeScript SDK 1.31.0        | Published devtools-MCP dependency          | High session/task and request-validation advisories, plus moderate redirect/authentication advisories       | ≥1.32.0                                                                     |
| Zod 4.6.5; body-parser 2.3.0     | MCP dependency graph; Zod also under knip  | High collection-validation memory exhaustion / compressed-body denial of service                            | Zod ≥4.6.6; body-parser ≥2.4.0                                              |
| markdown-it 14.3.2               | Internal API-reference generator → TypeDoc | High/default-options and low/HTML-enabled quadratic parsing advisories                                      | ≥14.3.3                                                                     |
| happy-dom 20.14.5; undici 8.11.2 | Development browser/test dependencies      | High code execution/SSRF and multiple network/TLS/cache advisories                                          | happy-dom advisories have different floors, highest ≥21.0.4; undici ≥8.12.2 |
| @vitest/mocker 5.0.2 and 4.1.11  | Development test servers                   | Moderate unauthenticated mock registration and Windows path bypass                                          | ≥5.0.3 / ≥4.1.12                                                            |

The full JSON also includes ip-address, fast-uri, @hono/node-server, qs, minimatch, and glob advisories. Its `dev` flags describe the installed dependency graph; they do not establish that the affected code is shipped to an application or reachable by an attacker.

Concrete applicability limits: `packages/devtools-mcp/src/server.ts` currently starts `StdioServerTransport`, so the presence of the SDK does not establish exposure to its HTTP-server-specific issues. DOMPurify is reached through Monaco; this review did not reproduce the critical advisory's attached-shadow-root and DOM-output preconditions in the Website. No exploitability exception is being claimed for either dependency. Resolve or explicitly assess these advisories before describing the dependency gate as clean.

## Snapshot and limits

Recorded on 2026-11-02 02:14 UTC. Source hashes identify the principal reviewed boundary files; the exact-commit gate must cover later edits and the rest of the candidate.

| File                                                             | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/foldkit/src/block/runtimeCapability.ts`                | `0d37cd43105e8d5178b5720fce0cf205bfb383dda18cf053331a894aa440a0a6` |
| `packages/foldkit/src/block/compiledOperation.ts`                | `e085ba9feb04cf645cccfbd1928d90dc72d79a1b9cf6f98f2567157cd01e66fc` |
| `packages/foldkit/src/block/receiver.ts`                         | `27f7f4757b71a8e5d98bb5ceb194c9669867cce906a5db72726418691685535f` |
| `packages/foldkit/src/experimental/constructed/runtime.ts`       | `6d45d228e4a8face6890192be691a9c8d058ff04cacd5fd49cd033ab0ddb908c` |
| `packages/foldkit/src/experimental/constructed/symbolic.ts`      | `eb80bf1b05712ed9b494f9f8b1173b3c077fbb99c2808d8ff313139c060e276b` |
| `packages/foldkit/src/experimental/contracted/runtime.ts`        | `4ed67fe37b1b7dd6946911be6d73e5c0409e59137e7f1e5e218087bfb040b0f4` |
| `packages/foldkit/src/experimental/contracted/familyRuntime.ts`  | `81cfa34c44082976b2db9fa981cf32c760b52622c034f6c4d6b39bb7d975397e` |
| `packages/foldkit/src/experimental/contracted/inMessage.ts`      | `0bf8751cd3af17829d6396b75cbb0b9ff7f042d755d120a8eadd499b7189a658` |
| `packages/foldkit/src/runtime/compositionRuntime.ts`             | `c3e5b9bd5354127e1f8648cc224831366acee4efc3ec4099af9e1bea72238d59` |
| `packages/foldkit/src/runtime/programConstruction.ts`            | `49a284c664df9e94a43299eb9d3faf359111550d6af62c4876f4629a7c22d840` |
| `packages/foldkit/src/runtime/rootBlock.ts`                      | `6ae4f830b5020f349ba8a0e95091a26d816b1bdbc90d7299bb052275327b1497` |
| `packages/foldkit/src/experimental/server/server.ts`             | `ae6f9f755690b57fd658f1013455cffe15a48b568ffb73e0ee66b3c646654b6e` |
| `packages/foldkit/src/experimental/layered/testing/withBlock.ts` | `f9855bb7123d2ffa3d3c06d01b603ccf3663b662077894dc1930e33b5e13c00f` |
| `packages/foldkit/src/experimental/layered/testing/inMessage.ts` | `694c3fa73c5571dd96f276e8118fad9e028002a8ff54dbe81d27dc274b957940` |

Audit JSON SHA-256: `a67cb47eda2bcf579da8f638b50cb5b119239587c10511a9314b032a88996e8d`.

This review did not fuzz serialization/DOM parsers, rerun dependency audits, test third-party advisory exploits, or establish the absence of defects throughout the repository. Copied declaration-compaction experiments were excluded from the runtime delta.

## Cached view-builder addendum

Reviewed the final `makeBuilderAdapter` change after a rendering regression showed that allocating a new Proxy on each render invalidated ordinary lazy-view arguments. This addendum found no new security defect. The correction preserves builder identity without sharing private graphs.

`makeBuilderAdapter(environment)` owns its WeakMap inside one `constructImplementation` call. Two acquired Compositions therefore do not share the adapter cache, even when the native Html builder is the same object. Both the original builder and its adapted value map to the same adapted object inside that graph, so nested helpers avoid another wrapper. The adapter's `block` method resolves symbolic embeddings only through its captured constructor environment and delegates to the original native builder. Missing connections still throw, and native Binding/view registration checks remain in the call path.

The cache stores builder adapters, not Runtime authorities, resource references, mutable Models, or occurrence status. It does not install lifecycle work or change the existing active-acquisition/occurrence checks. Keeping a builder value alive does not create a new resource capability or reopen a closed Scope.

Evidence inspected: `experimental/contracted/builderReuse.test.ts` has three regressions for ordinary lazy views, extracted input-bearing views, and separate acquisitions selecting different child implementations. `view-composition/verify-builder-reuse.mjs` restores the old per-render allocation and separately hoists the cache globally in copied source. Its `verification/builder-reuse-yJEmWv/results.json` records baseline/restored success and both expected failures. The global-cache control triggers the existing native child-registration rejection rather than silently using another acquisition's graph. Those focused checks were run by the implementation agent; this review read the tests and receipt.

After the final canonical build, this agent ran the unchanged 38-package application matrix: 35 declared scripts passed with 720 tests, zero source changes, and three explicit no-script skips. Receipt: `adoption-checks/verification/test-ufHH00/results.json`. The packed SSR consumer then passed the default Chromium gate again: `packed-adoption/verification/fresh-20261102T034408Z/receipt.json`. Its seven package distributions stayed unchanged during verification; strict peers, one Effect runtime, public types, npm workspace, dev relay, production SSR, hydration/refusal checks, and cleanup passed. These are verification runs associated with this addendum, separate from the initial read-only review.

Compared with the preceding packed snapshot at `fresh-20261102T031453Z`, only `experimental/constructed/runtime.js` changed among core JavaScript files. That older packed snapshot also predates the final Binding union type correction: `block/public.d.ts` and `experimental/constructed/bindingContract.d.ts` differ. This comparison therefore does not independently establish declaration identity for the adapter-only change; the implementation agent checked that separately against its final pre-adapter build. Reviewed source SHA-256: `106764780c7bbf0aea9b3c5d6292504a46bead71fd95f8810acd51e2e1ba8b36`. Built JavaScript SHA-256: `9c5d3214badc6b858837e0b2f8aa4d39349bec254c4eedd682bf914677214276`.

The dependency-advisory and Daybreak limitations above remain unchanged. This addendum does not replace review of an exact final commit.

## Exact-commit findings and candidate fixes

The exact review compared `7964029296e79389bc1bf55ac2cdf3b08e036c2e` with parent `be0cb38108693068da30eb835e6eb33d6d5762c8`. These findings were in an unpublished local candidate. This record does not claim they were present in a shipped release.

### Foreign Definition construction plans

The P2 runtime finding was in `experimental/contracted/runtime.ts`: completion derived its private Definition from the returned init plan, then compared only owner, Model, OutMessage and Never parity with the calling contract. Two valid Definitions made through one Namespace share their runtime owner. An erased call could therefore pass the second Definition's body to the first. The acquired Codec accepted the second local Message protocol instead of the declared first protocol. A properly typed call already rejected the substitution.

The focused reproduction used the committed source and matching final packed runtime: `/tmp/foldkit-exact-commit-namespace-probe.mjs`. Runtime completion now keeps a private WeakSet of the calling Definition's original authoring sources and authenticates `planComposition(body.init)` before private implementation construction. This checks the whole source identity, including Definitions sharing all Model/Message Schemas; it does not rely on another partial Schema comparison. Multiple original Compositions from one Definition remain valid.

`definitionSource.test.ts` has three cases: different local Message Schemas under one Namespace, matching Model/Message Schemas under distinct Definitions with different init contracts, and valid multiple-Compositions with deferred init. The rejected constructor case also proves resource release. The old implementation accepted both foreign bodies, producing two intentional red failures; the fix passes all three. The focused nine-file regression run passes 39 tests, and core source typechecking, scoped ordinary/Effect lint, formatting and whitespace checks pass. Logs: `/tmp/foldkit-definition-source-{red,green,scoped-tests,final-tests,noemit,lint,effect-lint}.log`. No canonical build was performed by the fixing agent; the lead then rebuilt the final artifacts.

### Family InMessage configuration validation

`experimental/contracted/family.ts` omitted `InMessageConfigurationArguments` from `makeFamilyDefinition` while ordinary Definitions already required it. Invalid family input declarations could compile and fail later at runtime: overlapping local/input tags, untagged input Schemas, unsupported input-name prefixes, and output metadata for nonexistent variants. The fix reuses the ordinary Definition's existing configuration validator. Runtime validation remains active.

Canonical source/emitted fixtures now reject those four malformed family declarations and accept a generic payload family with exact specialized input/output types. The independent copied-package control removes only the new family validation and observes all four expected-error directives become unused. Restored source, declaration emission, and strict physically relocated consumers pass. Evidence is in `/private/tmp/sol-family-contract-review/verification/`: `source.log`, `source-without-validation.log`, `emit-copied-core.log`, `emit-fixtures.log`, and `relocated-consumers.log`.

### Verification after both fixes

The lead's coordinated core/UI build passed before the following runs. No application, dependency, or product behavior source changed during this verification:

- `adoption-checks/verification/test-eLbwgo/results.json`: 38 packages inventoried, all 35 declared test scripts passed, 720 tests, three explicit no-script skips, and zero source changes.
- `packed-adoption/verification/fresh-20261102T042258Z/receipt.json`: the existing complete default Chromium gate passed with `--skip-build`, strict peers and the four exact 4.1.0 versions, one physical Effect runtime, public TypeScript checks, npm workspace execution, dev relay, production SSR, hydration/refusal behavior and cleanup. All seven distribution trees remained unchanged during the gate; seven tarballs and the temporary consumer were removed, and port 5199 was free.

These focused and packed results do not substitute for the lead's full integration run or exact amended-commit review. The 35 dependency advisories above remain unresolved by this task, and there is still no fresh Daybreak review.

Post-review source hashes:

- `packages/foldkit/src/experimental/contracted/runtime.ts`: `a4555a7d6693dd2b5eff071a27c443bcdbb0cccdf734f36237d01e2d85ce1812`.
- `packages/foldkit/src/experimental/contracted/family.ts`: `5cd807d789d84a7e766216afa87092296ba7f1186a519545d26ba278dba30e87`.
- `packages/foldkit/src/experimental/contracted/definitionSource.test.ts`: `7477abbf4d17efb5f125870d475af7503502c22740c9bfb2e6ec1ec34b12c9d2`.

## Constructor snapshot follow-through

Independent review of the next local candidate, `d9a8c`, found a remaining authentication gap in the first runtime fix. Completion authenticated `body.init`, then spread the original body. An erased constructor could expose an init getter that returned its own plan for the first read and a foreign plan for the second. The checked value and compiled value could therefore differ. This was a candidate-only follow-through finding, not a claim about a shipped release.

The correction first checks `Object.hasOwn(constructorBody, 'operations')`, preserving rejection of non-enumerable operation declarations, then snapshots the constructor result once with `{ ...constructorBody }`. Authentication, receive handling, and compilation use only that snapshot. The original Definition's private authoring-source check remains in place; this change makes the authenticated input the one actually compiled.

Two focused regressions were added to `definitionSource.test.ts`. The changing accessor is read once, mismatched init/update Composition plans are rejected, and init remains deferred. The second case preserves rejection of a non-enumerable own `operations` field. The pre-fix run accepted the changing-accessor constructor and failed the rejection assertion; the corrected three-file run passes all 15 tests. Core source typechecking, scoped ordinary lint, and scoped Effect lint also passed. Logs: `/private/tmp/foldkit-definition-source-snapshot-{red,green,noemit,lint,effect-lint}.log`.

The lead then ran the selected eight affected integration groups, not a fresh full 22-group run. `adoption-checks/verification/final-fmawkv/results.json` records successful build, core source, full core runtime (4,018 tests and one skip), UI runtime (1,351 tests), chat runtime, InMessage runtime controls, public views, and Website runtime (1,526 tests). The prior full `final-BSU05S` integration receipt remains separate. The lead's `/private/tmp/foldkit-constructor-body-snapshot-dist-comparison.json` compares 1,497 distribution files: all 499 core/UI declaration files are byte-identical, and only `experimental/contracted/runtime.js` plus its declaration-map source positions changed.

After confirming that build passed, this agent ran only the existing packed consumer gate with `--skip-build`. `packed-adoption/verification/fresh-20261102T043504Z/receipt.json` records a complete default Chromium pass: strict peers and four exact 4.1.0 dependency floors, one physical Effect runtime, public TypeScript 6 declarations and inferred Programs, npm workspace execution, dev relay, production SSR, hydration/refusal behavior, and cleanup. All seven package distribution trees remained unchanged; the seven tarballs and temporary consumer were removed, and port 5199 was free. The application test matrix was not repeated for this snapshot-only fix; its latest 35-script/720-test receipt remains `test-eLbwgo` above.

Final snapshot hashes for this follow-through:

- `packages/foldkit/src/experimental/contracted/runtime.ts`: `c42e841377052bb8c697d281388a082aa2b119f1156e617ccdfa488b26e3f757`.
- `packages/foldkit/src/experimental/contracted/definitionSource.test.ts`: `6aaf2ee0fe0131cd6a18e126094bcc1de551c6f904582abb360dafb07e26d663`.
- `packages/foldkit/dist/experimental/contracted/runtime.js`: `b810cf46a9ebdf03638775b55a6ef9d1decafa885d69c3883aa829d79124ffb4`.

No production source, build, dependency, commit, or publication action was performed by this verifying agent. The 35 dependency advisories and absence of a fresh Daybreak review remain unchanged. Review of the exact amended commit is still required.

## Dependency stabilization addendum

After the construction review, a fresh lockfile audit reproduced the same 35 advisory records. Targeted dependency updates subsequently removed 33 records. The refreshed workspace audit now reports two moderate findings, for glob and minimatch under older build/lint/documentation tool constraints. No audit exclusion or incompatible override hides those findings.

The changes, exact compatible parent ranges, Node floors, production/tooling exposure, remaining trust paths, and focused receipts are recorded in [Dependency advisory stabilization](./dependency-advisories/README.md). That report distinguishes the workspace overrides from ordinary downstream npm installation. Its strict packed MCP/scaffold consumer installs patched transitive versions without those overrides, reports zero production audit findings for that installed graph, exercises the MCP stdio protocol and CLI startup, and confirms the build-only cleanup graph is absent. A temporary tarball control restoring the former cleanup dependency fails the absence check.

This later dependency task does not retroactively change the initial audit or the earlier review scope. The workspace still has the two documented findings, and there has been no fresh Daybreak review or external source transfer. Release approval and exact final-commit review remain separate gates.
