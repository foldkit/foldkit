# Preview feedback integration

This integration follows the Block organization and application-test cleanup at
`5515c7ad923bf5d5a9c634dea319a4e65ecbc65e`. User edits and review comments are
preserved in that checkpoint. The incoming contributor commits are retained
individually, followed by a separate maintainer repair.

## Contributions

All six contributions below are by [Jakub Matyka](https://github.com/jaqbec1).

| Contribution                                          | Consumer behavior                                                                                                                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1886](https://github.com/foldkit/foldkit/pull/1886) | Cancel a late Fetch response body after the Node client's disconnect, including the interval before Node owns the stream.                                                                |
| [#1888](https://github.com/foldkit/foldkit/pull/1888) | Reacquire a Scene Mount when a retained element has a different marked child owner.                                                                                                      |
| [#1889](https://github.com/foldkit/foldkit/pull/1889) | Open an empty Menu without an invalid active index, dangling active descendant or item Commands.                                                                                         |
| [#1890](https://github.com/foldkit/foldkit/pull/1890) | Exercise Query cancellation, superseded results and child removal through Runtime, real handlers and controlled Services.                                                                |
| [#1891](https://github.com/foldkit/foldkit/pull/1891) | Pointer previews and drops use destination positions after removing the source, matching keyboard moves. Remove compensating consumer subtraction.                                       |
| [#1893](https://github.com/foldkit/foldkit/pull/1893) | Route retained Scene Mount results through the current rendered boundary while their acquiring occurrence is active, addressing [#1887](https://github.com/foldkit/foldkit/issues/1887). |

The two Scene contributions are complementary. Their integration preserves both
the acquisition path and the occurrence-owned dispatch resolver. The maintainer
repair also retains physical-element bookkeeping across occurrence retirement,
so a child removed and recreated under the same key can acquire a new marked
Mount. Runtime/Scene comparisons cover replacement in a single bubbling event
and marker restoration after retirement. Active lifecycle guidance describes
both ownership and renderer identity.

The Menu repair derives the usable active index from the supplied items. A
parent can clear or shorten its list without a stale item activation or dangling
active descendant. The Model retains its interaction state; no new Subscription
or state machine is introduced. The drag-and-drop changeset uses a minor bump
because consumers with a compensating subtraction must change.

## Verification

Isolated contribution checks pass 37 Node tests, 126 Menu tests, 76 DragAndDrop
tests, and 885 Scene/Query/Html tests. Source, emitted and relocated declaration
checks pass; four UI/Node and two Scene mutation controls fail at their intended
assertions and restore exact source. Canonical integration gates and actual
browser checks are recorded after the final combined run, not inferred from
those isolated results.

The private evidence is under
`/private/tmp/foldkit-review-followups-20261104/feedback/`. Integration manifests
name the original contributor commits and final file hashes. Final isolated
verification used direct pinned executables and individual package links. The
earlier shared-dependency setup incident and its excluded results are recorded
in the review evidence.

## Release boundary

The November 5 refresh finds no new discussion comments on #1655 after the
previously assessed October 30 report. Main's synchronized target is
`a471adb24d750ab9e8d8312edad53ff6f26d961b`; its content was already integrated
by the earlier preview main-sync work. [#1879](https://github.com/foldkit/foldkit/issues/1879)
has the existing unsupported SSR build-watch diagnostic repair, rather than an
unimplemented promise of full build-watch support.

The conditional-parent workflow reported by
[Awjin in the main-targeted Dialog proposal #1892](https://github.com/foldkit/foldkit/pull/1892)
is repaired through the preview's existing signals. Failed opening or lifecycle
acquisition schedules `CloseDialog`, and its acknowledgement emits `CompletedClose`
after native cleanup. `Closed` retains its existing Model-transition timing; no
additional `FailedOpen` OutMessage is adopted. All 74 Dialog Story/runtime tests
pass, including plain and animated parents and stale acknowledgements during
replacement. Public-only parent Layer/Story consumers pass on both compilers.

The same public-consumer checks exposed provider declaration nameability gaps in
five UI entry points. Type-only re-exports make their original child keys reachable
without changing runtime exports or identities. All 17 ordinary UI providers emit
independently on both compilers. The permanent checker keeps the five affected
providers in separate programs, where missing names cannot be masked by imports
of another component. Nine behavior and declaration mutation controls verify
the two repairs and restore exact source.

Publication remains held for user review. This new candidate has no authorized
Daybreak source transfer; earlier exact-commit approvals do not cover it.
