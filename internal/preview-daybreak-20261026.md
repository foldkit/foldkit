# PASS — exact reviewed source scope

No new release-blocking vulnerability was verified in the complete `1f6776f…e3202fc` production delta. Publication remains held for user approval.

## Actionable finding

- **Low — inherited, documented `OnMount` last-wins behavior.** At [html/index.ts:2578](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/packages/foldkit/src/html/index.ts#L2578), a second `OnMount` overwrites the first marker and lifecycle hooks. Preconditions: application code attaches multiple `OnMount` directives to one VNode. Consequence: the first Mount never starts, so its expected behavior is absent; it is not an acquired-resource cleanup leak. This predates the published base and is explicitly documented at [mount.md:79](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/packages/website/src/page/core/mount.md#L79). Smallest hardening: reject a second `OnMount` during VNode construction with a clear error. Current mitigation: combine both behaviors into one Mount.

## Security conclusions

- Composition update and connected-Step authority remains private and graph-bound. WeakSet/WeakMap provenance, exact Composition completion, passive recipes, and output-channel resolution remain enforced at runtime. Type erasure or casts can lose static guarantees but do not mint runtime authority. See [delivery.ts:1112](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/packages/foldkit/src/block/delivery.ts#L1112).
- Record, HashMap, whole-variant, and initialization adapters validate storage shape, membership, keys, duplicates, wrapper identity, and resulting child selection. Initialization Commands are captured after the new graph is synchronized.
- Cancellation keys use the same selected own fields for invocation and interruption, through a null-prototype key record.
- ManagedResource aggregate `layer` and entry metadata are nonenumerable/private and cannot become resource entries. Constructor failures, Layer channels, identity, release, and finalizer cleanup remain preserved.
- Renderer Mount validation uses a fresh token for every full-tree scan. Frame dispatcher caching resolves the raw boundary before consulting its cache. Lazy rollback, eviction, remount, replay/live separation, and delivery-time stale guards remain intact. See [renderer.ts:392](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/packages/foldkit/src/runtime/renderer.ts#L392) and [runtimeSingleton.ts:176](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/packages/foldkit/src/html/runtimeSingleton.ts#L176).
- Child generation numbers are runtime-local, so identical runtime topologies can produce equal numeric generations. A transplanted envelope may therefore match another runtime. This is not a current authority escalation: there is no ambient cross-runtime delivery, and external dispatch requires explicit opt-in, Schema decoding, and trusted DevTools access that can already construct any valid Message. Current-occurrence and delivery-time admission remain enforced at [childOrigin.ts:160](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/packages/foldkit/src/runtime/childOrigin.ts#L160) and [runtime.ts:599](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/packages/foldkit/src/runtime/runtime.ts#L599). Portable envelopes would require a runtime nonce or equivalent provenance.
- Test helpers preserve the test/runtime boundary. Synthetic generation-zero envelopes do not create live occurrence authority; pending Commands, subscription emission, source identity, and final completeness remain checked.
- Program and DevTools ingress remain Schema-decoded and dispatch is opt-in. The automatic relay is authenticated and loopback-only. The explicitly configured fixed-port mode remains an intentionally unauthenticated, all-interface trusted-network option documented as unsafe on shared networks.
- Workspace renders user content as text, uses an in-memory repository, validates internal `returnTo` routes, and guards optimistic completions by issue identity, active state, and expected revision. These are consistency controls, not server authorization.
- The other PR 1655 requests are API/design proposals, not demonstrated security regressions or release requirements.

## Dependency qualification

I used the recorded October 23 evidence in [next-preview-security-review.md:54](https://github.com/foldkit/foldkit/blob/e3202fcf959cdffe3da85b2980fc6005b1e62ae3/internal/next-preview-security-review.md#L54): **1 Critical, 8 High, 11 Moderate, 4 Low**. This was not a fresh network audit.

Static inspection confirmed the current lockfile and relevant installed paths still match that disposition:

- Monaco 0.56.0 still delivers vendored DOMPurify 3.4.8; the external 3.4.16 override does not patch it. The reviewed advisory-specific modes remain inactive, but this is not a clean sanitizer audit. Delivering patched browser code remains required maintenance.
- MCP SDK usage remains stdio-only, without its HTTP/OAuth/task surfaces.
- No affected npm Undici fetch/EventSource/SRI consumer was established.
- Happy DOM evaluation remains disabled.
- No Vitest public mocker server configuration was found.
- markdown-it remains limited to the reviewed TypeDoc build path.

These unresolved inherited advisories are maintenance debt, not proof of a newly exploitable blocker in this delta.

## Integrity and limitations

- HEAD before and after: `e3202fcf959cdffe3da85b2980fc6005b1e62ae3`, detached and clean.
- All 6,895 tracked paths matched `frozen-source.json`.
- `review-delta.patch` exactly matched the base-to-target Git diff.
- `changed-paths.txt` exactly matched the base-to-target name/status list.
- `fa96bf7…e3202fc` changes only the four declared internal evidence documents.
- Supplied unauthenticated public-verification evidence reports both exact GitHub SHAs; I did not independently query the network.
- Static inspection only: no project code, tests, builds, servers, installs, configuration changes, or release actions were performed. Supplied green test statements were not treated as independent security proof.

## Report provenance

This copy replaces local source links with immutable GitHub links; the review
text is unchanged. The original captured report SHA-256 is
`bd6ab25ff45a57b60e1ab7b0955a20c61c46941dcfcd150f4316ffe9ea8de872`.
The original report, invocation, frozen-source manifest and session log are
retained under `/private/tmp/foldkit-final-security-20261026`.
