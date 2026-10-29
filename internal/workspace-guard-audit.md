# Workspace defensive-check audit

October 27, 2026. This audit concerns the Workspace example on the development
branch. It does not change the published preview.

## Simplifications

| Area                     | Source and guarantee                                                                                                                          | Change                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active member            | The root view builds Listbox options from `snapshot.members`; Listbox emits the selected option's ID. Workspace has no member-removal action. | Assign the selected ID directly. Remove the repeated membership lookup and its silent fallback.                                                                                                                                                      |
| Route selection          | URL parsing already constructs an `ApplicationRoute`.                                                                                         | Use the union's tag predicate for the `PageRoute` subset instead of validating the complete Schema on each internal branch.                                                                                                                          |
| Optimistic move position | The issue and its previous index come from the same snapshot.                                                                                 | Use `Array.findFirstWithIndex`; remove the second search and invented index `0`.                                                                                                                                                                     |
| Child initialization     | URL changes may precede loading, but all initializers use the same current snapshot.                                                          | Check loading once before composing initialization Steps. Retain entity lookups and existing-instance checks.                                                                                                                                        |
| Retained editors         | Successful load and move Messages already supply issues to reconcile.                                                                         | Pass those issues directly instead of rereading optional data; Binding operations already leave absent editors unchanged. Return the complete child Model from reconciliation so callers do not reconstruct its fields or repeat its identity check. |
| Notifications            | Individual IDs include the recipient. `makeNotifications` deduplicates comment recipients and produces at most one assignment notification.   | Individual Messages carry only the notification ID. Remove duplicate recipient comparisons and deduplication within one generated batch.                                                                                                             |
| Palette selection        | Result clicks originate in the open, nonanimated Dialog.                                                                                      | Remove the closed-dialog selection guard. Preserve the repeated-open shortcut guard so it does not reset an ongoing search.                                                                                                                          |
| Issue reload             | The Reload action is rendered for an incoming revision; its reset Step already owns the save lock.                                            | Pass the reset Step directly instead of checking for the revision again.                                                                                                                                                                             |
| Board preview            | Pointer and keyboard drag handling compute integer insertion positions.                                                                       | Remove numeric revalidation in the Board fold. Insert the preview with `Array.splitAt` rather than an optional insertion followed by an unreachable append fallback.                                                                                 |
| Activity simulation      | The assignment branch already checks whether a candidate exists.                                                                              | Perform that check once. Keep the no-data, no-issue and no-other-member cases.                                                                                                                                                                       |
| Empty project collection | Creating an issue requires an actual project; an empty repository is a valid input.                                                           | Disable New issue with an explanation when no projects exist, rather than offering a control whose operation silently does nothing.                                                                                                                  |

## Checks retained

- **URL entity lookup:** issue and project IDs originate outside the application.
  Unknown IDs render missing-entity feedback and do not initialize child Models.
  Saved-view links can outlive their session-local presets; embedded filters
  remain usable after reload.
- **Loading and failure states:** initial navigation occurs before repository
  loading completes. Views, initializers, retry admission and activity generation
  must handle absent data.
- **Retained occurrence identity:** repeated URLs and workspace refreshes must not
  recreate an editor or discard its draft. Existing-instance checks remain.
- **Pending forms and user input:** save/post/create locks protect submitted drafts
  and prevent duplicate Commands before the disabled view is patched. Blank text
  validation remains. Project existence and version conflicts remain at the
  repository boundary.
- **Asynchronous revisions and rollback:** save results retain issue/version
  correlation. Incoming revisions may race with local drafts and saves. Failed
  optimistic moves restore placement without overwriting newer fields or comments.
- **Repeated notifications:** an event can arrive again. Filtering against stored
  notifications prevents duplication and preserves read state. Bulk mark-as-read
  still needs its recipient. Selecting a notification still resolves its issue
  from the stored ID; an unresolved ID does not navigate to an invented target.
- **Generic UI adapters:** drag item/container strings are decoded at the Board
  boundary. Unchanged drops and foreign containers remain no-ops. Assignee values
  still decode the tagged string representation of an optional member ID.
- **Optional view data:** empty search results, absent assignees and notification
  bodies, missing related entities, and absent href-map entries retain their
  defined empty/text-only rendering. Notification timestamps are strings, so date
  parsing remains a boundary operation.

## Listbox contract limitation

Seven enum checks were tested for removal and retained. Ordinary rendered options
are correctly typed, but the generic Listbox's raw `RequestedSelectItem` and
`SelectedItem` Messages use `Schema.String`. Its generic factory refines operation
arguments and advertised OutMessages without specializing that runtime Schema.
Existing Stories demonstrate that a raw, decoded selection can supply an unknown
status. Removing the checks admitted an invalid draft or failed while constructing
a domain OutMessage.

These checks currently validate the child-to-domain boundary. A future
schema-backed Listbox factory should derive selecting Messages, operations and
`Selected` OutMessages from the same supplied Value Schema. A type-only change
would leave external decoding broad. This audit does not add that public API.

The string-only Listbox value channel also explains the assignee adapter's tagged
JSON encoding. The existing href-map ViewInputs contract permits missing links.
Both can be assessed separately; neither warrants a cast, fake ID or silent
assumption in this cleanup.

## Verification

The existing Story and Scene suite covers active-member selection through rendered
options, typed filters, unknown enum rejection, retained editors, missing URL
entities, conflicting and stale saves, pending forms, notification read state,
and keyboard/pointer moves. Focused changes exercise normal palette selection,
notification recipient isolation by ID, and disabled creation without projects.
