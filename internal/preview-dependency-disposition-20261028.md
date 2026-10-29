# Frozen preview dependency disposition

The [subsequent Daybreak review](preview-daybreak-20261028.md) completed after
the user approved the source transfer and returned PASS for the same candidate.
The dependency assessment retains its source pin, timestamps and findings.
The later review does not patch or close those findings.

## Conclusion

No additional dependency release blocker was demonstrated through the current entry points and configurations inspected at `564adb49e908b3baf4c2e1855c8c6d67631b0c95`. This is a scoped static assessment, not a clean audit, a patched-dependency claim, or release approval.

The new Undici TLS 1.2 renegotiation advisory materially changes the earlier reasoning: it affects the ordinary Agent/request transport, including Effect's Undici-backed Node HTTP client. It must not be dismissed as fetch-only. No current Foldkit-owned entry point was found selecting that client for outbound requests, but a downstream server application that selects it can reach the affected path without opting into cache or decompression interceptors.

**Recommendation:** prioritize a bounded resolution of npm Undici to at least `8.12.2`, already permitted by its current parent ranges, before publication if practical. Recheck Node, MCP and applicable DOM consumers and rerun the audit after changing it. The evidence does not make that update a mandatory repair for a demonstrated exploit in the frozen configurations. If the frozen candidate is retained, carry its unresolved transport risk and configuration limits explicitly. A lockfile update cannot patch Node's separately bundled Undici or a downstream application's older lockfile.

The initial Daybreak source-transfer action was rejected before execution. The user subsequently approved the transfer, and the [completed Daybreak review](preview-daybreak-20261028.md) returned PASS for this exact source. This dependency assessment and that external review have separate scopes.

## Pin and evidence

- Source commit: `564adb49e908b3baf4c2e1855c8c6d67631b0c95`.
- Frozen source digest from the audit runner: `e8d49b0478ad9db7fd18341db11aa3cd979f2e97d47692d9fa50b9ad1fc49440`.
- Current `pnpm-lock.yaml` SHA-256: `00f307cf66a815646d60d24d69727cb7384fa3c9b8e785a38b08ddfc6bfa99f7`.
- Fresh audit completed at `2026-10-28T22:52:23.159519+00:00`; exit 1 denotes completed findings, not a failed network query.
- Raw audit SHA-256: `a8664af92ed4b7f61d75e1279c6d6953ad1533f76132fc786bf8839df9519915`.
- Findings: **30 entries, 28 distinct advisories: 1 Critical, 11 High, 14 Moderate, 4 Low**. Two Vitest advisory IDs appear on both installed major lines.
- Prior report: 24 entries and 22 distinct advisories, with 1 Critical, 8 High, 11 Moderate and 4 Low. The six additional entries comprise three High and three Moderate findings. Their presence in this audit is not evidence that six vulnerable dependencies were newly introduced by this source delta.

The companion [evidence JSON](preview-dependency-disposition-20261028.json) records installed pins, all six additional IDs and dependency paths, source and installed-code hashes, the current browser asset, and the review Node binary. The original audit, initial Daybreak rejection and subsequent approved execution records are under `rehearsal/security/`. The [completed-review receipt](preview-daybreak-20261028.json) records the final status.

The inspected npm copy is `undici@8.11.2`. The current review/build binary is Node `26.13.0`, whose `process.versions.undici` is **`8.12.2`**, with OpenSSL `3.5.9` and default minimum TLS version `TLSv1.2`. This establishes the current binary's bundled version, not the version used by every supported Node installation.

## Six additional advisories

### Undici shared-cache redirects: High

[GHSA-4w7w-5xrc-9h26](https://github.com/nodejs/undici/security/advisories/GHSA-4w7w-5xrc-9h26) requires an originless Agent with a shared cache and redirect/cache interceptors composed in the affected order. It can store a redirected response under the first URL, producing cache poisoning or disclosure to later callers.

No inspected Foldkit source constructs that interceptor chain or a shared Undici cache. Effect's `NodeHttpClient.makeDispatcher` creates an ordinary `new Agent()` without interceptors. The reviewed jsdom resource loader follows redirects through its own dispatcher and does not configure this shared-cache composition. Foldkit Query caching in a Model is not an Undici shared cache.

Disposition: inherited vulnerable npm version; the required cache configuration is absent. Reassess before installing a custom composed Dispatcher. Patch target: `8.12.2`.

### Undici custom TLS callback loss: High

[GHSA-2m5v-pch6-74hx](https://github.com/nodejs/undici/security/advisories/GHSA-2m5v-pch6-74hx) concerns function-valued options supplied through Agent's `tls` object. The installed `agent.js:44` deep-clones ordinary options; that loses a custom `checkServerIdentity` callback. Default chain/hostname checks still apply, so exploiting this bypass requires an application relying on the omitted additional check. Passing the callback through the unaffected `connect` route is a documented workaround.

No inspected Foldkit configuration supplies a custom TLS verification callback, either directly or through an Effect Dispatcher provider. The standard Effect Agent construction supplies no such options.

Disposition: configuration-dependent downstream risk; no current certificate-pinning contract was found that this candidate silently drops. Do not describe `dispatcher.request` as immune. Patch target: `8.12.2`.

### Undici TLS 1.2 renegotiation crash: High

[GHSA-qrxm-fqhp-jwvm](https://github.com/nodejs/undici/security/advisories/GHSA-qrxm-fqhp-jwvm) affects ordinary HTTPS requests. A controlled or compromised TLS 1.2 endpoint can renegotiate with a different certificate and make Undici's established connection error handler throw an uncaught assertion. The installed HTTP/1.1 handler at `client-h1.js:971` and HTTP/2 handler at `client-h2.js:597` retain the relevant certificate-error assertions.

Effect `NodeHttpClient.ts:159` calls **`dispatcher.request`**. Its normal Agent can therefore reach this flaw when a consumer uses that client against such an endpoint. Wrapping the request promise in `Effect.tryPromise` does not establish containment of an assertion thrown by a socket event callback.

The current owned entry points were inspected individually:

- `@foldkit/node` imports `NodeHttpServer` and converts inbound requests into the application's Fetch handler. `node.ts:269` invokes that local handler; it does not fetch the supplied URL over the network.
- Vite's SSR path imports the server entry through `ssrEnvironment.runner.import` and calls `renderPage`. Its module invalidation, request gate and disposal changes do not construct an outbound HTTP client.
- Website `entry.server.ts` loads Flags from bundled virtual modules and calls `Server.renderToString`; the inspected Flags loader performs local imports and date calculations, not outbound requests.
- `create-foldkit-app` copies bundled templates and invokes the chosen package manager. `NodeServices.layer` supplies filesystem/process/crypto/path/stdio/terminal services, not `NodeHttpClient`.
- MCP uses stdio and the `ws` package for its relay, not an Undici HTTP client. Typing Game's Node entry is an inbound HTTP/RPC server.
- Foldkit's `Http.layer` uses Effect's `FetchHttpClient`. In a browser this uses the browser's transport; in Node it uses the selected Fetch implementation. The current Node binary bundles the patched version, independently of the vulnerable npm copy.

Disposition: **transport-capable downstream High risk**, not a fetch-only finding. No current owned endpoint selecting the vulnerable npm client was established. A consumer adding `NodeHttpClient.makeUndici` or its Layer must update the resolution or apply an appropriate TLS 1.3 restriction first. Supported older Node binaries need their own bundled-Undici assessment.

### Undici WebSocket PONG buffering: Moderate

[GHSA-9fm3-97px-rjf6](https://github.com/nodejs/undici/security/advisories/GHSA-9fm3-97px-rjf6) requires a connection to a malicious or compromised WebSocket server. Automatic PONG writes can grow without respecting socket backpressure.

The MCP relay client explicitly imports `WebSocket` from `ws`; the Vite relay server also uses `ws`. Browser examples use browser WebSocket implementations. The installed jsdom implementation does import Undici's WebSocket, so that dependency is potentially executable, not harmless by virtue of being a test dependency. The inspected direct jsdom consumer is the React pixel-art comparison's local component test, with browser APIs mocked and no WebSocket connection. Active Foldkit tests normally select Happy DOM. No attacker-selected Undici WebSocket connection was found in the current owned application paths. The current Node binary's global WebSocket is a separate bundled implementation/version.

Disposition: inherited, with no current remote peer path established. A downstream jsdom harness or Node process connecting to untrusted WebSocket servers needs the patch. Patch target: `8.12.2`.

### Undici decompression callback exception: Moderate

[GHSA-55wc-3pg8-jfw6](https://github.com/nodejs/undici/security/advisories/GHSA-55wc-3pg8-jfw6) requires the decompression interceptor and a downstream response handler that throws, such as a size-limited dump interceptor. A throw from an asynchronous decompressor callback can escape per-request error handling.

The standard Effect Agent and inspected Foldkit providers do not compose Undici's decompression interceptor with such a handler. jsdom has its **own copied decompression interceptor**, whose readable-event callback also forwards data without catching downstream throws; updating npm Undici would not rewrite that copied code. No current direct jsdom consumer configures the relevant throwing handler or hostile resource loading. This is a qualification to retain if the DOM harness is expanded, rather than a claim that all decompression code is patched.

Disposition: the named npm interceptor configuration was not found; copied jsdom behavior deserves reassessment if external resource loading or custom interceptors are enabled. Patch target for npm Undici: `8.12.2`.

### qs comma-array serialization: Moderate

[GHSA-6pq8-jhm2-2vcw](https://github.com/ljharb/qs/security/advisories/GHSA-6pq8-jhm2-2vcw) requires `qs.stringify` with `arrayFormat: 'comma'` and a hostile array element that prevents normal string coercion. Without a synchronous error boundary, serialization can terminate a worker.

The pinned `qs@6.16.0` comes through the MCP SDK's Express/body-parser tree. The current executable constructs the low-level SDK Server with `StdioServerTransport`, not its HTTP middleware. The installed Express `utils.js:268` and body-parser `urlencoded.js:99` use `qs.parse`, which is not this advisory's serializer. No current repository or inspected SDK call selects the affected comma stringify form.

Disposition: inherited vulnerable version with no affected current serialization path. Patch target: `6.16.1`, through the existing compatible parent ranges. Enabling Express alone would not prove this particular stringify path; inspect the actual serializer configuration.

## Executed Monaco sanitizer

The Website build produced during this review's preceding build task contains:

- `monaco-editor@0.56.0`.
- Executed **vendored DOMPurify `3.4.8`**, imported by Monaco's `esm/vs/base/browser/domSanitize.js:3` from its adjacent bundled file.
- A separate dependency-metadata resolution of `dompurify@3.4.16`. The scoped override does not replace the vendored import.
- Current asset: `packages/website/dist/assets/editor.api-DqvSooaZ.js`, 2,652,399 bytes, SHA-256 `653855007fc4907ffd181b7df7249ec812e89252b367e45ed0779707d6dcf4db`.

The wrapper hash is unchanged from the October 26 review (`fd41b231eb5e191936ed5f84252b4d729a48e722348a82cfae25c45b7308ac7e`). It returns DOM fragments or TrustedHTML, but does not enable `SAFE_FOR_TEMPLATES`, `IN_PLACE`, XHTML parsing, custom-element handling or a supplied Trusted Types policy. It configures each call and removes its temporary hooks; it does not use the persistent `setConfig`/`clearConfig` path or mutate the hook's allowed-attribute record.

Consequently the three audited DOMPurify advisory triggers remain absent in this wrapper: [template mode](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7), [IN_PLACE detached subtrees](https://github.com/cure53/DOMPurify/security/advisories/GHSA-mrv2-3pqr-j5jr), and [XHTML SMIL parsing](https://github.com/cure53/DOMPurify/security/advisories/GHSA-c6gr-qvv4-5v3f). This is not a patched-sanitizer conclusion.

The fresh October 28 public GitHub advisory query for actual vendored `dompurify@3.4.8` returned **nine records: eight nonwithdrawn, nonduplicate advisories and one withdrawn duplicate**. The eight match the October 26 inventory. Five are beyond the lockfile's external `3.4.16` metadata: persistent configuration/hook attribute pollution (`GHSA-cmwh-pvxp-8882`), retained Trusted Types policy (`GHSA-vxr8-fq34-vvx9`), custom-element hook handling (`GHSA-c2j3-45gr-mqc4`), and two IN_PLACE paths (`GHSA-55q2-fjhq-7xh7`, `GHSA-6688-9rhm-gjv2`). The unchanged wrapper still lacks those configurations.

[GHSA-jxrp-r7gx-q4j8](https://github.com/advisories/GHSA-jxrp-r7gx-q4j8) is explicitly marked as a duplicate of [GHSA-c2j3-45gr-mqc4](https://github.com/cure53/DOMPurify/security/advisories/GHSA-c2j3-45gr-mqc4). Its API `withdrawn_at` is `2026-10-02T22:43:11Z`, and the official database page confirms withdrawal on October 2. It adds no ninth independent path: both records concern enabling `CUSTOM_ELEMENT_HANDLING` with a post-element hook policy, which the inspected wrapper does not do. The duplicate's former Moderate label does not replace the canonical advisory's Low label.

The raw response is retained at `monaco-vendored-advisories.json`; its hash, all nine records and duplicate metadata are recorded in the companion evidence JSON. These vendored-code counts remain **separate from the 30 lockfile audit entries**. This query refreshes the inventory, not the executed sanitizer or its reachability verdict.

The remediation requirement remains delivery of at least `3.4.17` in the sanitizer browsers actually execute, through a compatible Monaco update or reviewed import patch, followed by editor/hover and rebuilt-asset verification. Raising the external override alone is insufficient.

## Retained findings from the earlier assessment

The remaining 24 audit entries are not closed by this review:

| Component                          | Current scope and retained limitation                                                                                                                                                        | Maintenance target                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| MCP SDK `1.31.0`                   | Stdio tools only; no SDK HTTP/OAuth/bearer hosting or shared task store. A host controlling stdin can still exhaust local memory with oversized input.                                       | `1.32.0`; rebuild the bundled executable and verify tool/relay/cancellation behavior       |
| Zod `4.6.5`                        | No affected constrained-collection remote validation path established in the configured low-level Server; not a general input-size guarantee.                                                | `4.6.6`                                                                                    |
| Express/body-parser and ip-address | HTTP middleware is not the configured MCP transport; no hostile compressed request or address parser path established.                                                                       | body-parser `2.4.0`, ip-address `10.7.4`                                                   |
| fast-uri `3.1.8`                   | SDK AJV loads it for Schema references; it does not govern Foldkit relay host authorization or destination checks.                                                                           | `3.1.9`                                                                                    |
| markdown-it `14.3.2`               | Both current TypeDoc projects request JSON output. The affected Markdown HTML/reference renderer was not established in that generation path. Foldkit Markdown is separate.                  | `14.3.3`                                                                                   |
| Happy DOM `20.14.5`                | Its installed default keeps JavaScript evaluation disabled. Repository configurations do not enable it; prerender parses repository-owned HTML with a default Window.                        | `21.0.4`, with a dedicated compatibility check                                             |
| Vitest mocker `4.1.11` / `5.0.2`   | No configured browser mock-registration plugin surface; Node/Happy DOM tests do not establish the affected remote registration path. Windows traversal additionally needs Windows semantics. | Each existing major's patched release, `4.1.12` / `5.0.3`, plus matching coverage packages |
| Three earlier Undici advisories    | No npm Undici fetch/EventSource/integrity path established in current owned consumers. That exclusion applies only to those earlier findings, not TLS/Agent or WebSocket findings.           | `8.12.2`; assess the Node binary separately                                                |

The prior Vite/launch-editor repair remains outside the fresh findings: the pinned `launch-editor@2.14.2` override is retained. No additional unreviewed transport was introduced by the SSR lifecycle or lazy Playground loading changes inspected here.

## Current inherited-path rechecks and complete inventory

The inherited dispositions above were rechecked against this installed tree, rather than inferred from the old counts. The SDK Server still constructs AJV, but its reviewed validator call is on elicitation; Foldkit does not call that operation. AJV's installed URI runtime imports fast-uri, while relay authorization uses the platform URL parser. The SDK tools/call input accepts an optional unknown-value argument record (`types.js:1336`); its bounded `values` array at line 1905 belongs to the unused completion path. Foldkit then decodes tool arguments with Effect Schema (`tools.ts:256`). This is not a general bound on stdin JSON size.

Both installed Vitest Happy DOM adapters were read: they preserve default settings and change error capture, without enabling JavaScript evaluation. Current repository configuration selects no browser mock-registration plugin. The direct jsdom comparison test uses repository-owned component markup without remote peer construction. The current TypeDoc implementation selects JSON serialization at lines 17085–17088, separately from its HTML renderer at 17090–17091; both package configs explicitly select JSON. The fresh successful API generation from the preceding Website build uses these configs. The actual Monaco wrapper and asset were independently hashed as described above.

Each audit entry is accounted for below. “Additional” refers to the six newly reported entries compared with the prior snapshot, not a newly introduced dependency. All entries remain unresolved dependencies; an absent current precondition is a scoped reachability disposition.

| Audit ID / GHSA                 | Package and installed version      | Severity | Snapshot   | Current disposition                                                                  |
| ------------------------------- | ---------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------ |
| 1242628 / `GHSA-22jm-h49p-29qw` | `@modelcontextprotocol/sdk@1.31.0` | High     | Inherited  | Tools/stdio; no HTTP/OAuth/shared-task-store configuration                           |
| 1242630 / `GHSA-6prh-2h8m-c8cw` | `@modelcontextprotocol/sdk@1.31.0` | Moderate | Inherited  | Tools/stdio; no HTTP/OAuth/shared-task-store configuration                           |
| 1242646 / `GHSA-vfgh-jcmw-g37q` | `markdown-it@14.3.2`               | Low      | Inherited  | TypeDoc JSON writer; no affected Markdown renderer selected                          |
| 1242649 / `GHSA-46jr-4wx8-v453` | `@modelcontextprotocol/sdk@1.31.0` | High     | Inherited  | Tools/stdio; no HTTP/OAuth/shared-task-store configuration                           |
| 1242667 / `GHSA-rvq5-wwqv-78pq` | `@modelcontextprotocol/sdk@1.31.0` | Moderate | Inherited  | Tools/stdio; no HTTP/OAuth/shared-task-store configuration                           |
| 1242672 / `GHSA-gfr2-rv44-r23c` | `markdown-it@14.3.2`               | High     | Inherited  | TypeDoc JSON writer; no affected Markdown renderer selected                          |
| 1242766 / `GHSA-qxg6-89mg-rqv8` | `@vitest/mocker@5.0.2`             | Moderate | Inherited  | No public browser mock registration plugins configured                               |
| 1242767 / `GHSA-qxg6-89mg-rqv8` | `@vitest/mocker@4.1.11`            | Moderate | Inherited  | No public browser mock registration plugins configured                               |
| 1242768 / `GHSA-xp26-3454-mjgp` | `@vitest/mocker@5.0.2`             | Moderate | Inherited  | No public browser mock registration plugins configured                               |
| 1242769 / `GHSA-xp26-3454-mjgp` | `@vitest/mocker@4.1.11`            | Moderate | Inherited  | No public browser mock registration plugins configured                               |
| 1242880 / `GHSA-cg2g-xh64-v4q7` | `dompurify@3.4.16`                 | Critical | Inherited  | Actual Monaco wrapper lacks advisory modes; vendored code remains unpatched          |
| 1242881 / `GHSA-mrv2-3pqr-j5jr` | `dompurify@3.4.16`                 | High     | Inherited  | Actual Monaco wrapper lacks advisory modes; vendored code remains unpatched          |
| 1242882 / `GHSA-c6gr-qvv4-5v3f` | `dompurify@3.4.16`                 | Low      | Inherited  | Actual Monaco wrapper lacks advisory modes; vendored code remains unpatched          |
| 1242883 / `GHSA-rxp7-6hxx-x8q5` | `ip-address@10.7.2`                | Moderate | Inherited  | SDK HTTP middleware path absent                                                      |
| 1243066 / `GHSA-mrhx-c7xc-m3w5` | `zod@4.6.5`                        | High     | Inherited  | No affected constrained collection selected; tool envelope uses unknown-value record |
| 1243074 / `GHSA-27r3-jxmh-p828` | `body-parser@2.3.0`                | High     | Inherited  | SDK HTTP middleware path absent                                                      |
| 1243077 / `GHSA-4qv8-2p9j-2685` | `undici@8.11.2`                    | Moderate | Inherited  | No npm EventSource parser consumer selected                                          |
| 1243080 / `GHSA-f72v-6w45-q472` | `undici@8.11.2`                    | Moderate | Inherited  | No npm fetch integrity option selected                                               |
| 1243084 / `GHSA-834v-8h66-3h79` | `happy-dom@20.14.5`                | High     | Inherited  | JavaScript evaluation disabled in both adapters and prerender defaults               |
| 1243098 / `GHSA-w74x-v6f9-j3xg` | `fast-uri@3.1.8`                   | Moderate | Inherited  | AJV loaded for Schema references, not relay authorization                            |
| 1243101 / `GHSA-xhq7-xmqj-769h` | `fast-uri@3.1.8`                   | Low      | Inherited  | AJV loaded for Schema references, not relay authorization                            |
| 1243104 / `GHSA-wjr9-j795-jxcr` | `fast-uri@3.1.8`                   | Moderate | Inherited  | AJV loaded for Schema references, not relay authorization                            |
| 1243107 / `GHSA-333x-w4r6-6crp` | `fast-uri@3.1.8`                   | Low      | Inherited  | AJV loaded for Schema references, not relay authorization                            |
| 1243112 / `GHSA-xjj6-f33q-929c` | `undici@8.11.2`                    | High     | Inherited  | No npm fetch content-encoding consumer selected                                      |
| 1243452 / `GHSA-6pq8-jhm2-2vcw` | `qs@6.16.0`                        | Moderate | Additional | No comma stringify path; inspected middleware uses parse                             |
| 1243472 / `GHSA-4w7w-5xrc-9h26` | `undici@8.11.2`                    | High     | Additional | Required shared-cache/redirect interceptor chain absent                              |
| 1243474 / `GHSA-2m5v-pch6-74hx` | `undici@8.11.2`                    | High     | Additional | No function-valued tls verification option supplied                                  |
| 1243477 / `GHSA-qrxm-fqhp-jwvm` | `undici@8.11.2`                    | High     | Additional | Effect request transport capable; current owned outbound client not selected         |
| 1243480 / `GHSA-9fm3-97px-rjf6` | `undici@8.11.2`                    | Moderate | Additional | MCP uses ws; no current jsdom remote WebSocket peer                                  |
| 1243483 / `GHSA-55wc-3pg8-jfw6` | `undici@8.11.2`                    | Moderate | Additional | Required npm decompressor/throwing-handler composition absent                        |

## Verification boundary and release hold

This assessment read the fresh audit, six primary upstream advisories, the exact source tree, installed transport/sanitizer code, and the local production asset. It did not install dependencies, change source or lockfiles, perform exploit testing, or certify every transitive code path. Only these report/evidence files were written. HEAD and tracked status remained frozen; the pre-existing untracked `packages/foldkit/node_modules_foldkit` symlink was preserved.

The initial Daybreak action did not execute after automatic approval rejected the source transfer. The user then explicitly authorized that transfer, and the subsequent external review completed with PASS. No retry ran before the approval. This local dependency assessment itself did not export source; the separate authorized review did.

The local rehearsal and Daybreak gates are complete for the recorded candidate. The release lead must retain the unresolved dependency inventory and verify any future dependency changes. Publication, merge, push and deployment remain subject to the user's separate release approval; registry and immutable-deployment acceptance follow that approval.
