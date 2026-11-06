# Complete Domains migration baseline

## Outcome

The complete app runs through the experimental Layered public API while preserving its existing application logic and extraction. The original app at commit `45e124c96fda4ec62fc477b2dced62ae8669009b` remains unchanged. This baseline precedes InMessage work.

Only three existing implementation files changed: `definition.ts`, `composition.ts`, and `block.ts`. One new `children.ts` module adapts the canonical Query/UI Blocks. Five test files adopt scoped Block-aware Story/Scene setup. Forty-seven existing source files—including Model, Message, init, update, view, reusable Steps, Query/RPC, and backend logic—remain byte-for-byte unchanged. Every original browser assertion is unchanged. See [migration-inventory.json](migration-inventory.json) for the exact inventory and [provenance/source.json](provenance/source.json) for original hashes.

The ordinary client Program, production provider, and SSR entries are unchanged. The new root constructor yields eight typed Bindings and returns the independently authored implementation. Child startup arguments remain deferred in the existing Binding init configuration. The app's filters, Query completion policies, and extracted loading transitions require no constructor instance bags, casts, extra generic lists, or handwritten public Block contract.

## Ownership verified

Source and relocated emitted consumers assert:

- Graph Layer requirements and errors are `never`.
- Acquired handler Layer requirements and Program requirements are exactly `DomainsClient`.
- Story graph setup needs no client mock.
- Wrong timestamps, child operation names, init values, Message payloads, and unprovided Runtime startup are rejected.

The Query handler retains the real RPC Service requirement. Pure Stories and Scenes resolve Commands without running the transport. Execution tests still run the production RPC/client behavior with controlled transport and Clock inputs. Production browser tests execute the actual sample RPC backend through local Workerd.

## Gaps found and fixed in the isolated framework

The full app exposed genuine integration requirements that the small slice did not cover:

1. `initAndSet` needed the acquired symbolic Binding resolver. The original empty-query startup and viewport-reset Step now work unchanged, including SSR prerender.
2. Raw child delivery in Stories needed public deferred `Story.messageIn(Binding, message)`. Stale Query completion and VirtualList scroll tests now use it without constructing private envelopes. Shared ordinary Story Steps remain composable.
3. Root declaration emission needed reachable public `KeyedQueryModel`, Listbox `OutMessageSchema`, and Binding ownership evidence names. Public exports fixed portability without application annotations.

The original UI patch remains unchanged as provenance. Its missing VirtualList fixes were incorporated in the isolated UI source: native scroll movement during a row-layout update and width measurement before scroll observation. The existing signed-offset fix was already present. The patch is not applied twice.

## Verification

`node verify.mjs` passes all of these checks:

| Check                                                               | Result                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Complete app source typecheck                                       | Pass                                                                   |
| Exact source contracts and rejected combinations                    | Pass                                                                   |
| Normal application lint                                             | Pass                                                                   |
| Original unit, Story, Scene, Query/RPC execution, and backend tests | 86 passed across 7 files                                               |
| Root and provider declaration emission                              | Pass                                                                   |
| Relocated consumer using copied core/UI dist and manifests          | Pass, with `skipLibCheck: false` and no source/canonical-dist fallback |
| Production client + SSR build and `/` prerender                     | Pass                                                                   |
| Deliberately remove viewport reset                                  | Existing Story fails with `expected 1300 to be +0`                     |
| Original app provenance recheck                                     | Unchanged                                                              |

Separately completed browser checks:

- All 25 production Domains regressions in Chromium and all 25 in WebKit: **50 passed**, no retries or skips. These cover early input identity and hydration, history, filtering, cart, progressive/cached/retried lookups, responsive virtualization, mobile/desktop sort position, and live Inspect DevTools.
- Three development-host checks in both engines: **6 passed**. These cover styled HTML before scripts, HTTP404 recovery, coordinated hydration, and actual RPC delivery.

Commands and counts are in [browser-results.json](browser-results.json). `node verify.mjs --browser` reruns the production pair. Local browser execution needs permission to bind loopback listeners and launch browsers. Wrangler logs are kept under this copy. Existing development performance warnings and Vite's bundle-size advisory were observed; this task makes no rendering or compiler-performance claim.

## Scope and remaining work

This is a full application-root migration with an explicit compatibility boundary for existing framework Query/UI Blocks. It does not rewrite those canonical library implementations. The separate accessibility/mobile/Worker matrix, infrastructure compiler/deployment, and listening with a screen reader were not rerun. Their source and assertions are retained.

The spike reuses installed dependencies through `setup-local.mjs`; it is not a fresh-package-install reproducibility claim. Original package/lock/patch provenance is retained. No deployment, original-app edit, commit, push, release, or InMessage conversion was performed.

[MIGRATION-SKETCH.md](MIGRATION-SKETCH.md) identifies the concrete current operation seams for the next proof. Preserve this runnable baseline before comparing that API.
