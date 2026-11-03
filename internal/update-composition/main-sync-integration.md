# Main-sync edits and application comments

## Source

The source worktree is `/private/tmp/foldkit-preview-main-sync-20261029`, on
`codex/preview-main-sync-20261029`. Its committed HEAD, `be0cb3810869`, is already
an ancestor of the candidate. The missing work was its five uncommitted files.
Their exact patch hash and unchanged source state are in the
[integration receipt](main-sync-integration.json).

The integration preserves the current public contracts, Layer construction,
InMessages, and `blocks/` layout. It does not replace current files with the
source worktree's earlier assembly API.

| Source edit                      | Integration                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job Application `command.ts`     | Use the Definition's exported `makeCommand` helper without changing the handler or its Layer.                                                                       |
| Job Application `composition.ts` | Use the exported Binding, fold, and Composition builders, preserving init arguments and policies.                                                                   |
| Job Application `definition.ts`  | Export those owner-bound builders alongside the Step helpers. Preserve the current independent contract configuration.                                              |
| Job Application `update.ts`      | Resolve the question about child completeness through deliberate public selectors.                                                                                  |
| Workspace `composition.ts`       | Export the policy-complete IssueDetail and IssueBoard Bindings directly and acquire those same values in the constructor. The registration array is already inline. |

The integration did not modify the source files or the shared d576 checkout.
A [November 3 source recheck](verification/main-sync-source-recheck-20261103.json)
reconstructs the five edits from the original commit and saved patch and
confirms their bytes are unchanged. The source directory currently lacks its
Git worktree marker; this recheck does not assume it is a live checkout.

## Comments addressed

### Child completeness and error queries

The parent passes each child Model to the child's public `isComplete` or
`hasErrors` selector. The child owns interpreting its fields. These queries do
not modify child state and do not need a Message, cached Boolean, or framework
operation.

The Job Application selectors now live in the relevant child's `validation.ts`,
including repeated entries. Their explicit barrels expose the intended query
surface. Parent update and views call that surface through the child namespaces;
they do not import child update implementations.

### Inline child registration

Single-use constructor `children` and Composition `bindings` arrays are inline.
The convention is recorded in repository, scaffold, and skill guidance. The
application audit found no separately assigned `children` or `bindings` lists.

The canonical exported Binding includes its OutMessage policy. The same names
are used in the constructor, Composition, update, and view. This convention is
applied to Workspace, Job Application, Auth, UI Showcase, Website UI/chat, and
active coordination snippets. Internal base Bindings are retained where
deferred self or sibling operations need a dependency boundary; they are not
the app-facing configured Binding exports.

### The Listbox Layer

`ActiveMemberListboxBinding` registers the relationship to `WorkspaceListboxBlock`.
The shared `ListboxLayer` supplies that contract's implementation during graph
construction. It is the implementation provider for the registered child, not
another child missing from the `children` array. The active member's state and
occurrence lifecycle stay Model-owned. The scaffold and skill reference explain
the relationship/provider distinction.

## Verification scope

Job Application and Workspace source checks, their 68 and 153 existing tests,
and both production builds pass. Auth and UI Showcase source checks and their
affected Scenes pass. Website source, all 1,528 tests, and the chat regressions
pass. No new application tests were added for the file moves and renames.

The native compiler emits all configured exports from Job Application,
Workspace, and Website. Strict source-free relocated consumers pass, including
the existing contract-erasure controls. The active snippet check passes source,
runtime, declaration, relocation, and mutation checks; its 33 historical files
are preserved.

A separate TypeScript 6 run found inaccessible type names in exported
destructured helpers. Those compiler failures are retained in the local
verification evidence. The repair makes the existing internal types reachable
without changing runtime behavior or adding application annotations. Its final
checks retain their own compiler and artifact scope.

The earlier packed browser and rendering receipts retain their snapshots.
This integration does not claim a new benchmark or security review. The Daybreak
request for `6f5debecc38` does not cover this expanded candidate, and publication
is held.

The [helper portability follow-up](packed-release/receipt-portable-helpers-followup.json)
records successful real-app TypeScript 6.0.3 emission, all seven unchanged
compiler budgets, and a fresh strict packed TypeScript 6 consumer check using
the real 204-changeset release plan. All 350 emitted core JavaScript files and
the six companion distributions match the preceding browser-tested artifacts.
Only two core declaration files changed. The earlier three-browser proof is
reused for that unchanged runtime; no new browser run is claimed. Website's
normal production build also passes.
