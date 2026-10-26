# Next preview security review

## Duplicate-Mount finding closed, October 26

The [bounded Daybreak addendum](preview-daybreak-hardening-20261026.md) passes the
exact `f6ead23…f5506b7` delta and closes the earlier Low duplicate-Mount finding.
It verifies the guard's ordering, per-element/per-render scope, direct and child
attribute processing, passive acquisition, ordinary Mount/Unmount lifecycle,
replay/stale-dispatch behavior and context restoration when construction throws.
The customization guide's alternate view retains the completed child's graph.

Frozen target `f5506b7e240a4d8987338f22427a2bd1ecdf9cb5` is detached and clean;
all 6,900 tracked paths match. The [fresh nine-package rehearsal and verification](preview-final-hardening-20261026.md)
separately pass for source digest
`b8b162accc756093e0516fbc0d0c12378915370b2eb680514d377fc0086f2abe`.
The addendum is static review, not a fresh audit or independent test run.
Dependencies, manifest/lockfile, transport and scheduling are unchanged; the
inherited advisory and runtime-provenance qualifications below retain their
scope. Publication remains held. The earlier report below records the finding
before this approved repair and is preserved as history.

## October 26 final review

[Daybreak's exact-source review](preview-daybreak-20261026.md) passes the complete
published `1f6776fa7ece` to `e3202fcf959cdffe3da85b2980fc6005b1e62ae3` production
delta, including frozen implementation `fa96bf7d90`. No new release-blocking
vulnerability is verified. Its one actionable Low finding is the inherited,
documented single-Mount-per-element limit: a second `OnMount` replaces the first
before acquisition. A fail-fast duplicate check is a hardening proposal, not
implemented behavior. The [new community feedback assessment](preview-feedback-20261026.md)
records that constraint and the runtime-local envelope contract.

The Daybreak checkout is detached and clean before and after review; all 6,895
tracked paths match the frozen manifest. Daybreak inspected source without
running project code, tests, builds, installs or a network audit. Its attempted
subagent tracks were unavailable, so the model completed the review directly.
Failed shell checksum attempts were replaced by a successful complete manifest
comparison; no source drift was found.

A separate independent dependency review ran pinned pnpm 11.8.0 with registry
access at 18:32:50 UTC. Its JSON is byte-identical to the October 23 snapshot:
**1 Critical, 8 High, 11 Moderate and 4 Low**, across 24 entries and 22 distinct
advisories. The unchanged lock hash is
`b0b766fbc14e481bcc2d59b53458d6ea15d84287b904f0b01661c2e94847ba47`;
the audit hash is
`97adaed15f7264f636d1dd9391cb727b661a41e91bbaf5af56db7444724444d5`.
The review finds no concrete reachable dependency blocker in the inspected
configurations. This is not a clean audit or a patched-dependency claim.

Monaco's final local Website bundle still executes vendored DOMPurify 3.4.8.
An additional query for that actual version reports eight advisories, five of
which are hidden by the external 3.4.16 dependency metadata. Their required
configuration modes or hook behavior are absent from the inspected wrapper;
keep those findings separate from the lockfile counts. Remediation must replace
the executed sanitizer and verify rebuilt code and editor behavior. The earlier
Vite/`launch-editor` blocker remains patched. MCP remains stdio-only, and API
generation uses TypeDoc's JSON path. Changing these paths requires a new
reachability assessment.

[Combined security, advisory, build and feedback evidence](benchmarks/security-20261026.json)
records the fresh audit, final local Website asset, source hashes and limits.
The three subsequent Website changes clarify admission and correct migration
prose; the active changeset also removes an unpublished helper name. They do not
change framework/package code. The final Website production build passes with
281 Foldkit / 21 UI TypeDoc warnings and the existing chunk-size warning. It is
not a deployed-asset check. Exact final documentation/metadata receives separate
commit review; Daybreak's reviewed source target stays `e3202fcf95`.

Publication and integration remain held for user approval. The older dated
records below retain their original scope and are not substituted for this
final review.

## October 23 disposition

Reviewed on **2026-10-23**. No new release-blocking code vulnerability was established in the reviewed source delta. The fresh dependency audit remains **1 Critical, 8 High, 11 Moderate, and 4 Low**. These findings are unresolved maintenance items with the reachability limits below; this is not a clean-audit result.

The release lead retained the current dependency checkpoint for this candidate after reviewing these paths. Compatible updates remain recommended followups. Reassess the disposition before enabling any affected transport, parser mode, browser plugin, or script-evaluation setting. The sanitizer followup must update the code delivered to browsers, not only its dependency metadata.

This is an independent static review. It is **not a Daybreak model run or certification** and does not extend the earlier Daybreak verdict. Publication still requires the user's explicit approval.

## Final initialization and testing delta

Independent static review covers `7cae18608761` through the final Program guard,
optional initialization leaf, testing delivery and keyed-cancellation repair,
plus the exact example alias followup at `1b89a2325553`. No new security or
behavioral blocker was found. Exact committed changes have independent review.
[Final verification and release boundary](preview-ready-20261025.md).

The Program guard is type-only. `initAndAppend` reuses registered native init
recipes and validates supported storage, duplicates and wrapper identity.
Test-only delivery reuses recorded Schema/mapper contracts without creating live
occurrence authority; keeping a Command pending preserves its exact identity and
final completeness. Cancellation derives both keys from the same selected own
fields in a null-prototype record while preserving original handler/metadata args.
The example alias adds no execution or external-input capability.

The fresh local installed/browser rehearsal is separate evidence. Workspace uses
the recorded post-freeze alias correction; unchanged package inputs establish
transfer of packed acceptance. It is not an unchanged exact-commit freeze or
registry/deployment acceptance. Final static reports:
`/private/tmp/foldkit-release-ready-20261025/verification/final-static-review.md`
and `alias-and-rehearsal-review.md` in that directory.

The lockfile remains `b0b766fbc14e481bcc2d59b53458d6ea15d84287b904f0b01661c2e94847ba47`.
The dependency findings and reachability limits below remain unresolved. This is
not a fresh audit or Daybreak run, and publication remains held for approval.
The older addendum below retains its original declaration-boundary checkpoint;
Workspace now emits through ordinary checked assembly with an exported exact
Binding tuple type.

## October 25 addendum

The final local review covers record-only update authoring, focused producer callbacks, owned ManagedResource registries, the exact UI handler records, and Workspace's private declaration boundary. No additional blocking code finding remains in this reviewed delta. The October 23 review and dependency dispositions below retain their original scope. This addendum is not a new Daybreak run or a fresh dependency audit.

The reviewed shared delivery source is `aae3ac48f1da6ee4f883b61e3dce538effa0a3d1c81da715265c5342261c00cf`; its declaration is `858da5e8a66bbee998271a80cc73ce645dc64c3f1970d740c683f86712df3c80`. Final evidence is recorded in `/private/tmp/foldkit-independent-review-final-20261025.json`, SHA-256 `f275f781fd019bfce718bf415ced265b2abf38a95c752a7c5774bc4ac95b9174`.

- Composition retains update provenance in a private WeakSet. Completion rejects an update authored by another Composition. Registered child delivery still precedes local handling; a context factory runs only for local dispatch. Focused producers remain deferred, and producing Commands does not execute their Effects.
- Owned ManagedResource registries validate private entry identity and attached Layers, normalize nonenumerable entries, reject inherited records, symbol keys and the reserved `layer` entry key, and freeze the registry. Aggregation and lifting preserve entry identity. The aggregate Layer remains passive and retains provider requirements and constructor errors.
- The UI kernels now return exact per-Message handler records. Review retained selection order, original-versus-next Model use, animation registration, and existing generic selection refinement boundaries. The repair adds no Model, graph or requirement cast.
- Independent checks rejected an intermediate encoding that accepted fourteen invalid result unions. The final encoding rejects those cases; all twenty-eight independent negative controls pass against source and emitted declarations. Actual Typing Game Room, the official record controls, the UI declaration harness, and Workspace emission and strict relocation pass. The final core type repair preserves all 286 parsed JavaScript programs; the sole byte difference from the reviewed runtime control is moved ManagedResource documentation.

At the earlier addendum checkpoint, Workspace required fourteen exact `typeof` references across its two root files. Its 110 declarations total 11,452,935 bytes. The checked boundary preserves implementation and Binding drift guards; this result establishes neither unlimited serialization nor an editor speedup.

The current lockfile hash is `b0b766fbc14e481bcc2d59b53458d6ea15d84287b904f0b01661c2e94847ba47`. Its only change from the October 23 lockfile adds the already-resolved `clsx` 2.1.1 to the Workspace importer. Overrides are unchanged. The recorded **1 Critical, 8 High, 11 Moderate, and 4 Low** findings remain unresolved under the documented reachability limits; Monaco's vendored sanitizer is not newly patched. No source was uploaded externally. Publication still requires the user's explicit approval.

## Scope and evidence

- Candidate: the working tree at `/private/tmp/foldkit-preview-followups`, on `codex/workspace-example`, based on `31d8aad9fe4555112b3cf8e2d948badeee9ced0d`. This review includes the subsequently adopted `CompletedUpdate` and `OwnedDocumentView` interfaces.
- Published comparison: official public source for `1f6776fa7ececa766188df5201eefec6ba781b5d`, downloaded at `/private/tmp/foldkit-published-1f6776-20261023`. For each changed tracked source file, the candidate's original Git blob matched that published source. Generated directories were excluded from the source comparison. New Workspace files were reviewed directly.
- Prior scope: `/private/tmp/foldkit-preview-prep-6bd4335c/security/daybreak-addendum.md`, whose verdict covers its stated earlier commit delta. Its preserved audit snapshot was 1 Critical, 4 High, 7 Moderate, and 2 Low.
- Fresh audit supplied by the release lead: `/private/tmp/foldkit-next-preview-audit-20261023.json`. Its 24 reported entries include separate affected Vitest version lines; they are not 24 newly introduced vulnerabilities. The dependency source delta adds the Workspace importer rather than upgrading the affected packages. New advisory reports still require review even when the installed versions are inherited.
- Reviewed lockfile SHA-256: `a9828cc4183827876b63141a823a7c833db9726fcb3642e7cd9b2e6fd135b099`.
- Reviewed `packages/foldkit/src/block/definition.ts` SHA-256: `d6dc044f4fda11ea42418dfb20c8f7211e3740a5022ebbea97ecb3c6299c3a5c`.
- Reviewed `packages/foldkit/src/block/public.ts` SHA-256: `ef8f4f5ccdd414d0d281596a1ead45654020ca633b25741300909b7bab7a5d2d`.

The reviewer inspected source, installed dependency code, public upstream advisories, and the supplied compiler artifacts. No installer, build, benchmark, exploit proof, or broad test job was run by this reviewer. The only review edit is this report. No source was sent to an external service.

## Changed framework and consumer code

### Preserved runtime boundaries

- `packages/foldkit/src/block/commandsStep.ts:45`: the Model callback is invoked when the returned Step is applied. Constructing it is passive; the result retains the supplied Model.
- `packages/foldkit/src/block/delivery.ts:1250`: handler-record construction and `withContext` at line 1372 remain passive. Dispatch selects the registered child route before local handling. A context factory runs for the selected local dispatch, and the existing operation-graph scope still restores its previous state through synchronous `try/finally` in `block/operationGraph.ts`.
- `packages/foldkit/src/update/update.ts:1125`: the runtime rejection of discarded OutMessages complements the stronger compile-time rejection for combined connected Steps. The source/consumer checks tighten the accepted result shapes; they do not introduce an input-decoding bypass.
- `packages/foldkit/src/block/assemblyState.ts` and `runtime/programRoot.ts`: opaque draft/completion provenance still uses private WeakMap/WeakSet associations. The new interfaces do not create completion tokens, public runtime constructors, or a path around Program validation.
- `packages/foldkit/src/block/operationMessage.ts`: registered operation-constructor provenance is unchanged.
- `packages/foldkit/src/devTools/webSocketBridge.ts:640` and `runtime/runtime.ts:606`: external Messages still pass Schema decoding and current-occurrence admission before prepared dispatch. The development/hot-module bridge and default development-only, top-window DevTools visibility remain unchanged. This does not claim DevTools can safely be exposed to arbitrary network clients.

### Workspace inputs and effects

The reviewed Workspace Service is in-memory. This delta adds no remote persistence endpoint, raw-HTML rendering sink, dynamic code execution, or credential handling. User-visible text is rendered through the existing Html builders.

`examples/workspace/src/issueDetail/update.ts:84` checks the issue identity, active Saving state, and expected revision before accepting save completion. `issueDetail/composition.ts` retains keyed occurrence routing. `issueDetail/field.ts:27` decodes the assignee selection through Schema. `board/policy.ts` validates drag/drop identities, status, and placement before deriving a move. These checks protect Model consistency; the example is not a server authorization implementation.

No changed source/asset handling path was found that executes Workspace inputs, exposes filesystem paths to browser callers, or expands production DevTools access. This conclusion concerns the reviewed application and framework changes, not every third-party parser bundled by the website.

## Dependency reachability and maintenance

### MCP SDK 1.31.0: two High, two Moderate

`packages/devtools-mcp/src/server.ts:8` imports the low-level `Server` and `StdioServerTransport`. The server advertises tools only at line 53, registers `tools/list` and `tools/call`, and connects stdio at line 89. It does not configure an HTTP/SSE transport, `taskStore`, OAuth provider/client, elicitation, or completion handler. The DevTools relay is a separate `ws` connection, not an SDK HTTP transport.

The [experimental-task advisory](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-22jm-h49p-29qw) requires an HTTP server configured with a shared task store. The [request-memory advisory](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-46jr-4wx8-v453) explicitly excludes stdio-only servers. The two audited redirect/OAuth and bearer-audience findings likewise concern HTTP/OAuth paths absent from this executable. The current transport does not establish those exploit paths.

The low-level SDK still parses stdio JSON and validates request envelopes. Its `CallToolRequestParamsSchema` accepts arguments as a record of unknown values, after which Foldkit's handlers perform Effect Schema validation. A host controlling the spawned process's stdin can send arbitrarily large JSON and exhaust memory. This is a retained local-host availability limit, not evidence of a new remotely reachable defect. An SDK update does not establish a universal input budget: 1.32.0's `McpServer.maxToolInputElements` option is off by default, and the current executable does not use `McpServer`.

**Followup:** update the exact SDK dependency in `packages/devtools-mcp/package.json` to **1.32.0**, retaining the 1.x API. Rebuild and exercise initialization, tool listing/calls, cancellation, and relay behavior. `rolldown.config.ts:5` bundles this executable, so editing a manifest alone does not replace shipped SDK code. Any future HTTP implementation needs transport/body limits and explicit validation limits in addition to the version update.

### DOMPurify: one Critical, one High, one Low in the audit

`pnpm-workspace.yaml:61` overrides Monaco's external dependency to **DOMPurify 3.4.16**. However, installed `monaco-editor@0.56.0/esm/vs/base/browser/domSanitize.js:3` imports `./dompurify/dompurify.js`, whose version at line 406 is **3.4.8**. The external override does not replace this vendored module.

The wrapper does use `RETURN_DOM_FRAGMENT` at `domSanitize.js:234`. Its other relevant settings are:

- `SAFE_FOR_TEMPLATES` remains false. The wrapper neither enables nor exposes this setting, so the [shadow-root template bypass](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7) lacks its required mode. The maintainer labels this advisory Low while the fresh audit database labels it Critical; the audit count above preserves the database result.
- `IN_PLACE` remains false, so the [detached-subtree hook finding](https://github.com/cure53/DOMPurify/security/advisories/GHSA-mrv2-3pqr-j5jr) lacks its required mode.
- The parser remains `text/html`, with the wrapper's restricted tag/attribute configuration, so the [XHTML SMIL finding](https://github.com/cure53/DOMPurify/security/advisories/GHSA-c6gr-qvv4-5v3f) lacks its required XHTML mode.

These are concrete mode-based limits, not a claim that Monaco ships a patched sanitizer. No exploit through the reviewed wrapper was established for these three advisories. Other vulnerabilities in the vendored version were not independently exhaustively audited.

**Followup:** deliver **3.4.17** in the executed sanitizer. A contained option is a pnpm patch for Monaco's sanitizer import to use its external `dompurify` dependency, together with the existing scoped override updated to 3.4.17. Verify ESM/default-export compatibility, Playground editor/hover rendering, and the final website asset's actual sanitizer version and import resolution. A Monaco release that updates the vendored code is another option. Raising the override alone is insufficient remediation evidence.

### Zod 4.6.5: one High

Zod is inherited through the SDK and development tooling. The [upstream fix](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd) moves upper bounds for arrays, sets, and maps ahead of element validation. It does not impose bounds on every otherwise unbounded collection.

The reviewed MCP tool arguments use Effect Schema after the SDK envelope. SDK `types.js` contains a bounded completion-result array at line 1905, but Foldkit does not use that completion path. No affected constrained-collection path accepting untrusted remote input was established. General stdio JSON/memory limits remain as described above.

**Followup:** resolve **4.6.6** through the existing SDK/peer ranges (`^3.25 || ^4.0` and `^3.25.28 || ^4`). Preserve the existing major and recheck the MCP executable. Do not describe this patch as complete request-size protection.

### markdown-it 14.3.2: one High, one Low

This dependency belongs to `internal/api-reference-generator` through TypeDoc 0.28.20. `generate.mjs:30` runs TypeDoc against the two package configurations; `packages/foldkit/typedoc.json` and `packages/ui/typedoc.json` request JSON output only. Installed TypeDoc's output selection chooses that JSON writer. Its markdown-it rendering setup is attached to the HTML renderer; the comment-link helpers used during conversion do not invoke the vulnerable reference-rendering rule.

The [multiline-reference advisory](https://github.com/markdown-it/markdown-it/security/advisories/GHSA-gfr2-rv44-r23c) affects ordinary markdown-it rendering even with default options. Neither that rendering path nor the audited HTML-inline rendering path was established in the configured JSON generation. If HTML TypeDoc output is enabled, repository-controlled comments/Markdown become a build-availability exposure. The website's Foldkit Markdown parser is a separate implementation.

**Followup:** resolve **14.3.3**, already permitted by TypeDoc's `^14.3.0`, and run the existing API-generation gate. No TypeDoc or markdown-it major update is needed.

### body-parser 2.3.0 and ip-address 10.7.2: one High, one Moderate

Both are inherited through the SDK's Express HTTP dependency tree. The current stdio executable does not install this HTTP middleware. The [compressed-body crash](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828) requires body-parser to process a compressed HTTP request. The [IPv6 zone-identifier cost](https://github.com/beaugunderson/ip-address/security/advisories/GHSA-rxp7-6hxx-x8q5) requires a long attacker-controlled address to reach its parser. Neither path is used by the reviewed MCP transport or its separate relay.

**Followup:** resolve **body-parser 2.4.0** and **ip-address 10.7.4**. Express's `^2.2.1` and express-rate-limit's `^10.2.0` permit these versions. Reassess before adding SDK HTTP hosting, including the middleware's placement before routing/authentication.

### Undici 8.11.2: one High, two Moderate

The audit paths are through `@effect/platform-node` and jsdom. The [content-encoding crash](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) is in Undici `fetch`; the other two findings concern its [EventSource parser](https://github.com/nodejs/undici/security/advisories/GHSA-4qv8-2p9j-2685) and [Subresource Integrity handling](https://github.com/nodejs/undici/security/advisories/GHSA-f72v-6w45-q472).

The installed Effect Node HTTP client uses `dispatcher.request`, and the inspected jsdom integration uses dispatchers/WebSocket rather than these `fetch`/EventSource paths. No repository use of npm Undici `fetch`, EventSource, or an integrity option was found in the reviewed consumers. This does not establish safety for downstream applications that choose those APIs. Node's global `fetch` has its own bundled Undici; an npm lockfile update does not patch the Node binary.

**Followup:** resolve **8.12.2** within Effect's `^8.11.2` and jsdom's `^8.10.2` ranges, retain the existing Node compatibility gates, and recheck Node/MCP and applicable DOM tests. Reassess independently if the runtime Node version or fetch usage changes.

### Happy DOM 20.14.5: one High

The [import-alias host-execution advisory](https://github.com/capricorn86/happy-dom/security/advisories/GHSA-834v-8h66-3h79) requires JavaScript evaluation to be enabled and attacker-controlled HTML/module source to be processed.

Installed `happy-dom/lib/browser/DefaultBrowserSettings.js:6` has `enableJavaScriptEvaluation: false`. Both installed Vitest 4 and 5 Happy DOM adapters preserve that default and only override error capture. No repository config enables evaluation. `packages/website/scripts/prerender.ts:239` constructs `new Window()` to extract Markdown from the website's own SSR HTML; plugin build tests also use default Windows. Thus this dependency is used outside tests, but the advisory's execution precondition remains absent.

**Followup:** upgrade to **21.0.4** in a dedicated compatibility change, or a maintainer-supported backport if one becomes available. This is a major version change and is not justified as an emergency blanket override by the current reachability evidence. Verify prerendering and both Vitest lines. Include example/template dependency manifests: `create-foldkit-app/src/utils/packages.ts` preserves concrete template dev-dependency specifications. Enabling evaluation or accepting externally supplied modules invalidates this disposition.

### Vitest mocker 4.1.11 and 5.0.2: four Moderate entries

No repository configuration imports `mockerPlugin` or `interceptorPlugin`. Current tests use Node/Happy DOM environments. Upstream identifies the [manual mock injection](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8) with public Vite mocker WebSocket registration; ordinary Node test runs do not register that handler, and builds/previews do not execute `configureServer`. The [Windows traversal](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp) uses the same public registration surface and additionally depends on Windows path semantics. No corresponding active repository surface was established.

**Followup:** retain both existing majors and update to **4.1.12** and **5.0.3**, including matching coverage packages. Do not force the whole workspace onto one Vitest major just to clear the audit. Verify test-tool initialization and the existing package gates.

### fast-uri 3.1.8: two Moderate, two Low

The four audited canonicalization/normalization findings are inherited through the SDK's AJV validator. AJV is constructed by the low-level SDK Server, so it is inaccurate to call the dependency wholly unloaded. Its reviewed role is JSON Schema reference handling; no use of fast-uri for the relay's host authorization, loopback checks, or fetch destination validation was found. The [host-confusion advisory](https://github.com/fastify/fast-uri/security/advisories/GHSA-wjr9-j795-jxcr) is material when parser output governs those decisions. No such current trust decision was established here.

**Followup:** resolve **3.1.9**, permitted by AJV's `^3.0.1`, and recheck MCP behavior. Reassess if accepting external schemas or using this parser for URL security policy.

## Declaration-interface review

Reviewed the exact two-interface patch at `/private/tmp/foldkit-workspace-root-expansion-20261023/candidate.patch` and its adopted source.

- `packages/foldkit/src/block/definition.ts:1449`: `CompletedUpdate` names the same two normalized call signatures previously written inline. The curried signature remains first, the data-first signature remains last, the Context tuple remains exact, and `PublicProducerReturn` still supplies the output. The surrounding registration-evidence branch is unchanged. This preserves overload inference, `Parameters`/`ReturnType` selection, and the existing accepted call shapes.
- `definition.ts:390`: `OwnedDocumentView` extends the same `OwnedAuthoredView<DocumentView<...>>` intersection. It retains the callable Document return, Model/Message/Mount brands, owner field, and invariant owner/Model/Message function properties. No property became a bivariant method; no `any` or erased context was introduced.
- `packages/foldkit/src/block/public.ts`: the two type-only exports make the names available to emitted declarations. They add no runtime API or completion authority. Their `@internal` status keeps them out of the ordinary documented authoring surface.

The supplied runtime comparison records **280 JavaScript files checked, none changed**. The reviewer read the emitted root's named references, strict relocated-consumer config (`skipLibCheck: false`), positive consumer assertions, and the unannotated rejection log. The nine deliberate invalid sites still produce errors, including lost OutMessages, missing sibling registration, foreign Messages, incorrect initialization/context arguments, and incorrect Models. The supplied five compiler-budget results remain within unchanged budgets.

There is no independent safety or variance objection to this patch. The expanded-root emission/relocation evidence resolves that concrete portability failure. The 32-group synthetic root with `--save-all` still reaches TS7056. These results do not establish unlimited declaration scalability, editor speed improvement, or long-session language-server memory behavior.

## Remaining release evidence

- Preserve the final exact candidate, lockfile, package hashes, declaration/consumer results, and packed upgrade/scaffold rehearsals in the release manifest. This review did not independently execute those jobs or audit every final tarball.
- Run the requested final performance benchmark after all source changes. Preserve the pre-polish Website cold-constructor regression and the separate control definition until a valid final comparison supersedes them; the interface proof is not performance evidence.
- Carry the unresolved dependency dispositions into release preparation. Do not claim a clean dependency audit or a patched Monaco sanitizer. Any later dependency or sanitizer change requires refreshed build/asset evidence and a fresh audit before describing it as remediated.
- Obtain the user's explicit approval before publication. This report authorizes no publish, push, merge, or deployment action.

## October 25 testing and variant followup review

An independent read-only review of the subsequent `679d2d5e7f` delta found no new blocking code vulnerability. It inspected the frozen helper, Story, variant and Mount paths and their acceptance evidence. This is a focused static review, not a new Daybreak run or dependency audit.

`toParentMessage` requires native Binding metadata, invokes its retained tracked mapper and validates decoded child/key Type sides. Its synthetic generation `0` does not select a live occurrence; unchanged Runtime origin and lifecycle admission reject synthetic replay as live delivery. It neither decodes serviceful Codec inputs nor constructs decoding Services. Synchronous Type-side predicates retain their ordinary Schema limitations.

The variant helper checks closed/distinct tags, direct Schema membership, the actual child Schema identity and supported configuration. It lowers storage to existing native Bindings. Registration, contextual delivery, Subscription gating, parent-owned initialization and stale-generation rejection remain native. The Story change appends Commands while retaining earlier invocations and explicit resolution; final completeness remains required.

The extracted input annotation is guidance and proof coverage. The Mount repair is type-only; generic calls can still accept a name-preserving alias after its arguments have been explicitly widened to `any`. The review does not claim recovery of erased contracts.

The lockfile remains `b0b766fbc14e481bcc2d59b53458d6ea15d84287b904f0b01661c2e94847ba47`. All inherited dependency findings and reachability dispositions above remain unresolved. Neither this review nor a development-branch commit authorizes publication.
