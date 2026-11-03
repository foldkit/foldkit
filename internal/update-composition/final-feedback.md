# Preview feedback reconciliation

## Included repairs

| Report           | Candidate behavior                                                                                                                          | Verification                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| #1865            | Cleaning up a popup preserves an application-owned portal root. Foldkit removes its own empty roots.                                        | Regression fails before the fix; focused Anchor tests and the full UI suite pass.                                               |
| #1866            | ArrowDown after a pointer-opened Menu activates the first enabled item. Existing active-item navigation is preserved.                       | Both ordinary and initially disabled-item Scenes fail before the fix and pass afterward.                                        |
| #1868            | Ordered focused updates compose around one exhaustive update. Shared callbacks retain the dispatch's original Model through grouping.       | Source, emitted, relocated, runtime, and split-file Story coverage, including conditional and repeated-part rejection controls. |
| #1874            | The React example renders the same unique container ID it supplies to the embed host.                                                       | Source review and the normal Website build.                                                                                     |
| #1875 / PR #1877 | Relay discovery distinguishes process and network namespaces. It preserves records when a failed PID lookup cannot establish process death. | Portable relay tests pass. Added Linux integration cases require a Linux runner.                                                |
| #1876            | The client-only hot-update result does not suppress invalidation in an out-of-process SSR environment.                                      | The existing repair passes all 72 affected plugin tests.                                                                        |

The relay change adapts contributor Servaas Vandecappelle's commit
`9f8e20bd19b6ea1606f0194e879205ce5742e513`. Candidate review also added the
same-PID/different-network and unavailable-namespace cases. Upstream checks
precede those additions and do not establish their execution on Linux. The
local Docker Desktop daemon was stopped; no Linux execution is claimed.

## Additional candidate findings

Independent review found six unsound conditional or repeated-part update
combinations. The repaired validators reject uncertain router counts, hidden
erased channels, incompatible Context alternatives, and potentially competing
OutMessages. Accepted alternatives retain their exact Command requirements.
All seven compiler ceilings pass unchanged.

The strict packed TypeScript 6 consumer found that exported destructured helpers
needed reachable internal interface names. Three additional type-only exports
make the documented split-file pattern nameable without application annotations.
These changes leave all 350 emitted core JavaScript files byte-identical to the
preceding packed browser snapshot. The packed rehearsal records its own final
declaration and runtime checks.

The earlier authorized Daybreak review prompted six lifecycle, graph ownership,
configuration, teardown, peer-floor, and dispatch repairs. Their verification is
in [security-followup.md](security-followup.md). That approval does not cover
later public API and consumer changes. A fresh transfer approval is required
before sending this integrated candidate for a Daybreak addendum.

## Open proposals and bookmarks

- #1871 proposes a public dispatch-frame boundary for third-party renderers,
  compilers, and tests. It is not implemented or accepted into this batch.
- #1872 proposes providing the render frame scheduler through a Service. It is
  not implemented or accepted into this batch.
- `Query.define` to `Query.makeBlock` is the separately bookmarked naming task.
- The user explicitly deferred #1662 automatic OutMessage propagation and
  #1663 derived/default view slots until after the Blocks/Layers work merges.

The first two proposals have not been approved for deferral. Their general
integration use cases require a separate scope decision; they are not counted
as implemented release feedback.

## Application conventions

The organization and readability feedback applies to all example apps, Website,
and Typing Game. Owned child Blocks use `blocks/` directories and explicit
barrels. App code uses named UI subpath imports. Single-use registration lists
stay at their registration site, and framework contract fixtures stay in the
framework. Historical published content and labelled migration-before examples
retain their original APIs.

[Example migration and checks](app-layout.md) and
[Website/Typing Game migration and checks](website-typing-layout.md) record the
full application scope and deliberate domain/helper exceptions.
