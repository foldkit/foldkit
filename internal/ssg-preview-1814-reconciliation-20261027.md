# SSG preview contribution reconciliation

This followup reconciles [PR #1814](https://github.com/foldkit/foldkit/pull/1814)
with the existing [#1811 repair](preview-stabilization-1811-20261027.md).
The implementation starts from `2899c6cbfe8d9a4ec9924d7219567697d33b4d55`
on `codex/workspace-example`. Publication, promotion of Ready and merging to
main remain held. No external comment, issue closure or PR update was performed.

## Contribution and retained history

The reviewed contribution is draft PR #1814 by
[Taras Kornichuk (`artile`)](https://github.com/artile), head
`d92ae2d9148dba2a613dc2f3f5eba2c8eb52946b`, against main
`b702a5efbb74bebc056b798b414ddb923a82fbd5`. Its five commits are:

- `8b9c9fe00b754ea0a4e0745af91da5bddbe7bb9d`: directory-index preview resolution.
- `f37c4ccb898a9ed698304ff0cda2881f34b13928`: proxy and static precedence.
- `2f21134aab09aea336baba57b4acdd3fd6f288b8`: proxy matches introduced by rewriting.
- `b3652ed9079de2d9c96c17a5d13f41d4e694ebaf`: mismatched URL decoding.
- `d92ae2d9148dba2a613dc2f3f5eba2c8eb52946b`: disabled proxy entries.

The patch is adapted to the preview branch rather than cherry-picked. Its
dedicated preview module, build integration, execution-count fixture and HTTP
coverage replace the overlapping SSR-owned hook. The contributor's own
[validation comment](https://github.com/foldkit/foldkit/pull/1814#issuecomment-6452568777)
is retained separately from our executed verification below. This does not
claim that the draft PR was merged or that its work is published.

## Integrated behavior

- Install directory-index resolution only when prerendering is enabled. Omitted
  and false prerender options expose no preview hook.
- Resolve the actual client output. Preview honors a client-environment
  override, then root `build.outDir`, then Foldkit's `clientOutDir`. A later
  host plugin can override the resolved client output.
- Preserve enabled proxy ownership for both the original URL and the candidate
  rewritten URL. Ignore disabled proxy entries, as Vite does.
- Preserve exact files, extensionless indexes and flat HTML before generated
  directory indexes. Keep GET/HEAD, HTML negotiation, base paths, queries,
  original URLs, Vite headers, cache validators and existing fallback behavior.
- Reject malformed paths, decoder mismatches and escaping symlinks before
  rewriting. The realpath check constrains Foldkit's rewrite; it does not claim
  to secure every direct static URL Vite already serves.
- Keep preview independent of the server bundle. A real-build test removes the
  server output before preview and proves there is no further entry execution.

The existing `appType: 'custom'` stand-down is retained. Independent assessment
caught its absence in the contribution. Standalone and aggregate-plugin tests
now cover it, including a later custom host that receives the unchanged query
URL. The two output-resolution cases recommended by that assessment are also
covered. There is one preview-resolution path after integration.

Preview-specific validation stays in the new module. Generation's validator
alone does not establish Vite decoder agreement or realpath containment, and
importing it back from `build.ts` would create a module cycle. No public API,
generated-output layout, dependency, lockfile or compiler budget changes.

The active server-rendering guide and TSDoc explain prerender opt-in and custom
host ownership. The existing paired plugin/CLI patch changeset covers the
reconciliation without duplicating release prose. Historical verification and
the published Ready snapshot retain their original pins.

## Executed verification

| Check                                                     | Result                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Plugin source/test types and production declaration build | Pass                                                                                                        |
| Full plugin suite, one worker                             | 366 pass; three existing skips                                                                              |
| Actual-preview HTTP cases within that suite               | 33 pass                                                                                                     |
| CLI types, build/template generation and tests            | Pass; 18 tests                                                                                              |
| SSG example production build and raw Home/About paths     | Pass                                                                                                        |
| Existing strengthened SSG browser suite                   | 3/3 pass; no retries or skips                                                                               |
| Physically packed plugin in a generated SSG app           | Typecheck, build, raw HTML, JavaScript-disabled direct/link navigation and hydrated counter/navigation pass |
| Targeted normal/Effect lint, formatting and whitespace    | Pass                                                                                                        |

The opt-out tests fail against the previous SSR-owned hook. Custom-host tests
fail against the unguarded contributor module. Removing decoder agreement and
realpath containment separately makes the malformed/escaping-target test fail
with assertion failures. Exact source is restored, and the restored test passes.

The newly packed plugin has SHA-256
`1dc588f8e69666218da2ebe1062355a9ec3c0ebcc6fc8dd02032860316204828`.
All 33 dist files match the final build. The app and plugin resolve the same
Foldkit, Effect and Vite identities. The generated app has no browser warnings
or errors in the checked flows; its 30 inventoried files remain unchanged.
Owned preview servers and browsers are closed. The user's Workspace server
remains untouched.

This is a plugin-only packed delta over the frozen `93c49c77b6d2` generated-app
dependencies, with manual links to those verified installed packages. It is not
a fresh nine-package cohort, registry installation or deployment acceptance.
The current SSG example separately exercises the current checkout. No new
Block, lifecycle, compiler or rendering-performance claim is made. The earlier
full-cohort, performance and security records retain their original source pins.
An exact committed-diff review remains the gate before any push.

## Feedback refresh and handoff

The retained evening GitHub refresh finds this contribution and a tester's
independent confirmation of #1811 on main. The latest preview-PR comment reports
five generated consumers passing its own checks, with the same SSG defect.
The authors closed #1780 and #1783 after their adoption in #1801. No new review
or inline thread on the related contribution PRs was found. #1737 remains closed
with its ten retained comments. #1813's registration-render proposal remains
explicitly nonblocking, and #1812's stable-version modal report is outside this
Blocks/Layers stabilization scope.

Original metadata, patch and five commit records are retained under
`/private/tmp/foldkit-preview-feedback-refresh-20261027-evening`.
Our assessment, logs, mutation results, artifact provenance and browser records
are under `/private/tmp/foldkit-ssg-preview-1814-reconciliation-20261027`.
These local records supplement the public original commit references and
tracked source/tests; they are not the only description of the change.
