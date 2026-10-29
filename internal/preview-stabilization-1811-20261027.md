# Stabilization followup: SSG preview paths

This addendum records the late [#1811 report](https://github.com/foldkit/foldkit/issues/1811)
and its repair. Publication, preview-branch integration, Ready promotion and
merging to main remain held for the user's approval.

Implementation: `f15fa164624130f1773be20aac9090a9d1e2a9dc`, tree
`bcfd547940b480fd3f6f8738f08d224a7ac443be`, parent
`d97860167b1df76fff407e16d3456839cd5c7ea3`.
The following evidence-only commit changes internal reports.

The [preceding approval summary](preview-stabilization-final-20261027.md)
retains the full Blocks/Layers change inventory, feedback dispositions, 17-gate
verification and performance results at its original implementation pin. This
addendum qualifies that checkpoint with the affected SSG verification below.

## Confirmed defect and missed coverage

The frozen installed 93c SSG project returns byte-identical Home HTML for `/`
and `/about`. `/about/` and `/about/index.html` return the correct About HTML.
JavaScript-disabled direct navigation and clicking the generated About link
therefore show Home. Hydration corrects the visible page, hiding the defect.

The previous SSG browser gate checked `/about/` without JavaScript and exercised
`/about` after hydration. Its PASS did not establish correct initial HTML at the
declared extensionless path. The strengthened test now covers all three About
forms and the actual generated link without JavaScript.

Main `b702a5efbb74bebc056b798b414ddb923a82fbd5` has the same relevant scaffold
configuration, declared paths, link and directory-index output algorithm.
This is evidence the issue predates Blocks. Main was not rebuilt, and no
deployed static host was tested.

## Repair

The existing SSR plugin adds a private Vite preview middleware that resolves an
existing directory-index page before HTML fallback. It uses Vite's resolved
client-environment output directory, the configured base path and the existing
contained generation-path validator. Vite still serves the file and owns its
headers. Preview does not execute the server entry.

The repair preserves flat HTML precedence, assets, proxy ownership, GET/HEAD and
HTML negotiation, custom application routing and existing SPA/MPA misses.
Malformed or unsafe generation paths fall through without being reinterpreted.
There is **no application API or generated-output-layout change**.

An independent reviewer found that the initial encoding read the top-level
output instead of Vite's client-environment output. That P2 is repaired in the
amended implementation, with an actual-preview regression deliberately using
different directories. The earlier source and smoke records remain separate.

The active server-rendering guide, scaffold README and paired plugin/CLI patch
changeset explain directory-index resolution. Deployed static hosts still own
their routing or trailing-slash redirects; the local preview repair does not
configure deployments.

## Affected verification

- Plugin source/test typecheck and production build pass.
- The full plugin suite passes **350 tests**, with three existing skips,
  including **17** actual-preview cases.
- The strengthened SSG example suite passes **3/3 browser tests**, no retries,
  skips or failures. Direct HTTP responses identify the correct Home/About
  document before hydration.
- Ordinary SSG source checking passes. CLI template tests pass **18/18**;
  Website tests pass **1,500/1,500**. Targeted lint, formatting and whitespace
  checks pass.
- A physically unpacked final plugin tarball passes generated SSG typecheck,
  ordinary build, raw HTTP, JavaScript-disabled direct/link navigation and
  hydrated counter/navigation checks. All **30** packed dist files match the
  final build. The plugin and app resolve the same Foldkit, Effect and Vite.

CLI and Website checks cover the unchanged template/guide revisions. The final
client-output amendment is covered by the plugin and SSG checks.

The latter is a **plugin-only packed delta smoke**, not a new nine-package
cohort or registry acceptance. The prior 93c cohort's nine tarballs and 30 frozen
SSG app files remain unchanged. The new artifact SHA-256 is
`4816609d7c34b786ad11f9018fe661d2a01b8b99191047ee61a5f831ecbd65e5`.
All owned temporary servers and browsers are closed; the user's server is
untouched.

Two first attempts stalled in the machine's nested package-manager lookup.
Only owned processes were stopped, then the same commands passed with the
already prepared local pnpm shim. One browser harness initially selected no
package and consequently had no build; its log remains separate, and the
correct package-directory build plus all browser assertions pass. No dependency
or lockfile changed and no package-age policy was relaxed.

No Block, core Runtime, renderer, type-performance fixture or compiler budget
changed. The earlier source/emitted, lifecycle and performance evidence retains
its 93c pin; no fresh timing or long-session memory claim is made here. The
remaining diagnostic, generic-Service, cold-root and main rendering limits in
the preceding summary still apply.

## Reviews and handoff

Independent exact-commit source review passes after closing the output-directory
finding. The bounded Daybreak addendum also passes the exact amended source,
with no actionable finding and all 7,056 tracked entries preserved. These are
static reviews, separate from the executed checks above.

The final feedback refresh at **18:05 UTC** finds only #1811 updated since the
17:11 check; it has no comments. This adds one repaired correctness report to
the existing disposition ledger. No public comment was posted or issue closed.

Evidence is retained under `internal/stabilization-1811-20261027/`; original
full records remain at `/private/tmp/foldkit-issue1811-20261027`. The earlier
full-cohort, review and timing records remain separately pinned. Published
Ready still points to f3be. Registry/deployment acceptance and the actual
Coverchart upgrade remain post-approval release gates.
