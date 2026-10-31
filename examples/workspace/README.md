# Workspace

A project workspace built from Foldkit Blocks. It includes issue lists and routed editors, a project board, comments, saved filters, members, notifications, project settings, and a command palette.

Run from the repository root after the normal install and package build:

```sh
pnpm dev:example:workspace
```

The example needs no credentials or database. An Effect Service starts with sixteen issues across three projects. Changes persist for the lifetime of that application Runtime and reset when the page reloads. Views use Tailwind through the same Vite integration as the other examples.

## Try the interactions

- Search, filter, sort, and group issues. The URL records those settings for copied links, reload, and browser history. Name the current view and choose **Save view** to add the preset to the sidebar.
- Open an issue, edit its title or properties, and save. Lists, My Issues, and project boards use the same canonical data. Issue rows, Board titles, and member assignments are native links, including open-in-new-tab and copy-link behavior. Closing returns to the complete filtered origin.
- Close an edited issue, visit another issue, or use browser Back. The sidebar keeps each issue's draft for the session, including an unsent comment. Reopen it to continue, or choose **Discard changes** or **Discard comment**.
- In Settings, choose **Fail next save** and wait for its acknowledgement. Then open and edit an issue. The draft survives the failed save; choose **Retry save** to finish saving.
- Choose **New issue** to open the Dialog. Creation updates shared data and opens the new issue.
- Open a project's board. Each column's plus button opens Create issue with that project and status selected. Drag an issue between status columns or reorder it. The card moves immediately while the save is pending. A failed save restores its position without replacing newer issue data. Use the drag handle with a pointer, or press Space to start keyboard dragging, arrow keys to reorder, Tab to switch columns, and Space to drop. Handles keep focus through saving.
- Add a comment while an issue draft is dirty. Comments and activity update the baseline without replacing editable fields. A conflicting change to those fields requires an explicit reload before resaving.
- Use Cmd/Ctrl+K to open the command palette, including while typing in another input. Search issues or projects, navigate results with arrow keys, and press Enter.
- Teammate activity arrives every 20 seconds after the workspace loads. Comments notify assignees and participants; assignments notify their recipient. Open **Notifications** to read an update and visit its issue, mark it unread again, or mark all of the active member’s notifications as read. Switching **Active member** changes whose inbox you see. Read notifications remain available. Settings can simulate the next event immediately.
- Open project settings, change its name or description, and save.
- Navigate between issues while a save is pending. Each issue keeps one editor Model for the session, so the hidden editor receives its result and settles before it is shown again. Results stay scoped to their issue ID and cannot update the editor currently on screen.

## Product design

The interface puts issues and the current task first. Page headers identify the view; descriptions explain actual project scope or a consequence. Controls need a complete workflow, including loading, failure, retry, and keyboard behavior. For example, a saved view restores grouping as well as its search and filters. Row selection is omitted until there is a useful bulk action.

On narrow screens, opening an issue shows its editor directly. Desktop layouts retain the list and editor together. Simulation controls live in Settings, and routine save feedback stays below the save actions.

Every single-selection control uses Foldkit UI Listbox: Active member, list filters, creation fields, and issue properties. They share rendering through `listbox.ts` and application-owned Tailwind component classes in `styles.css`. Command-palette results use the same option, focus, and disabled treatments. Compact controls vary their density deliberately. Foldkit UI supplies behavior without prescribing the application's visual style.

Status, priority, sort, grouping, and status-filter Listboxes specialize the existing `Listbox.makeBlock<Item, Value>()` factory. Their option Schemas and shared view helper preserve the domain value type through each parent's `Selected` handler. Dynamic project, member, and encoded assignee values remain strings. Listbox's raw Message Schema still accepts strings, so the selection handlers retain validation for malformed injected Messages; the generic argument alone cannot validate runtime input. Local filter Messages declare their domain Schemas directly and reject invalid values during decoding.

Creating an issue locks draft editing until the request settles. `editDraftStep` accepts a Model-to-Model callback, keeping ordinary `modifyFields` calls and their field validation at the call site. A rejected edit preserves the incoming Model object. `createIssue.ts` supplies that policy to field updates and disabled controls. Submission separately prevents duplicate requests, and reopening a pending form preserves the submitted draft. Closing the Dialog remains available while creation is pending.

Issue and comment drafts survive internal navigation. Reloading or leaving the page requests the browser's native unsaved-work warning while drafts remain. Accepting that navigation discards the in-memory session; this is not durable storage, and browsers do not guarantee the warning in every exit situation.

See the [product review](../../internal/workspace-product-review.md) for the control decisions and remaining command-palette assessment. These are concrete consumer cases to assess before adding framework APIs.

## Ownership

The root Model owns the confirmed workspace in `workspaceAsyncData`: issues, projects, and members. Loading, refreshing, and failed refreshes retain the appropriate data without a second cache. `visibleWorkspaceAsyncData` overlays a pending board move for display. Lists, boards, the directory, and the palette receive that projection as view inputs. Their Blocks own interaction state, such as Listbox focus, dragging, or the active command result. Applied issue filters belong to the Route and enter Issue List as view inputs.

The root uses AsyncData directly because its mutation handlers apply live results and issue revisions to that same workspace. Query currently exposes fetch/reset operations without public retained-data reconciliation or settlement OutMessages for initializing routed children. The [Query assessment](../../internal/workspace-query-assessment.md) records that boundary.

The detail Block owns its editable draft, a baseline containing only editable fields and their revision, any conflicting field revision, and save feedback. Its baseline starts from confirmed data, including when opened during a pending board move. The parent supplies the current Issue as view input, so comments keep updating while a field conflict preserves the draft. Its nested Comment Composer owns comment input and posting feedback. The root retains one keyed detail instance per visited issue, created with `IssueDetail.each('issueDetails')` and initialized by an `InformedOfIssue` Message in the same update, and derives draft summaries for the sidebar and native exit warning. Keeping a draft does not create another authoritative issue collection. Successful mutations emit OutMessages; parent policy updates the confirmed workspace. Workspace refreshes reconcile every retained editor from the merged confirmed data, including hidden editors, by sending each one an `InformedOfIssueChange` Message. A move result updates its issue's editor only. Conflicts are separate from failed save attempts.

The Comment Composer shares its draft-editing lock between update and view. Submission rejects duplicate posts and completion only settles a pending post. The in-memory repository returns the new Comment, and the enclosing keyed issue occurrence owns live result admission, so failure Messages need no repeated issue ID.

Search replaces the current history entry while typing. Status, sort, grouping, and clear actions push a history entry. Named views provide preset defaults; explicit URL filters override them. An explicit all-default named view uses `filters=1` so clearing it does not restore its preset. Ordinary default list URLs omit filter parameters. Issue links carry an internal `returnTo` built from the current page when it differs from All issues. A copied filtered saved-view URL still renders its filters after session metadata resets, using the heading **Filtered issues**.

The Model's `route` follows the address bar. An Issue Route carries an optional `returnTo` query value. `pageRoute(route)` parses that value with the ordinary page routers to select the page beside the issue panel and its Close destination; other Routes select themselves. Missing or unsupported destinations use All issues. Navigation prints the selected Route instead of using the query value as a raw navigation target.

`route.ts` owns Route Schemas and URL parsing/building. Root selectors in `application.ts` select active editors and applied filters and build issue links from that state. `domain/navigationLink.ts` renders the navigation links shared by the sidebar and project tabs. Routes with query fields accept a fields object, including `{}` when no filters are supplied. Deleting a displayed saved view replaces the current URL with an ordinary filtered Issues destination while retaining its issue ID, so the issue stays open and Close returns to the repaired list.

The Notification Center owns notification records and each recipient’s read state, plus its nested Foldkit UI Popover. Parent policy supplies meaningful activity by sending it an `InformedOfActivity` Message. Ordinary workspace changes do not create notifications. Incoming events never open the panel or navigate; selecting a notification asks the parent to navigate. Notification state lasts for this session.

Project Settings owns its own baseline, draft, save feedback, and SaveProject Command. The parent retains one keyed editor per visited project for the session. Repeated URLs and workspace loading do not rebuild those editors, switching projects preserves unfinished changes, and a save can settle while another project is visible. Each dirty editor owns its native exit-warning Subscription. Board moves have separate pending and retry state, so project saves and moves do not block one another. A move response reconciles issue data only and cannot overwrite a newer project save. Background activity errors are separate from foreground announcements.

The repository owns the in-memory backing store. Block constructors yield the shared `WorkspaceRepository` Service, and their Command handlers perform each operation later. It provides asynchronous loading and mutation, simulated failure, monotonic IDs, and editable-field revision checks. Responses describe the completed mutation: saving returns editable fields and their revision, commenting returns the new Comment, and moving returns the issue ID, status, normalized position, and revision. Applying these results preserves unrelated fields, comments, and projects. Full workspace reads and conflict snapshots still reconcile comments by ID and retain the newest editable-field revision. A failed save preserves the local draft. A revision conflict publishes the latest shared issue and lets the user choose **Reload issue** before trying a revised save.

Detail children are keyed by their parent-owned issue IDs and stored in `issueDetails`. The Route selects the visible editor. Retained editors receive their pending save and comment results and report their draft projection.

Boards are keyed by project ID and retained in `issueBoards`. The selected page chooses which Board renders. Navigation updates the Route and initializes missing children; it does not clear retained child state or orchestrate drag cancellation. Workspace Services remain shared across those children.

Board cards use pointer or keyboard dragging to change status and order. The Board owns drag interaction state and reports the requested placement. Parent policy finds the issue's current version and sends the placement to the Issue Move Block, which owns the pending move, the `MoveIssue` Command, and the retry control. Issue Move reports the acknowledged placement or the failure, and parent policy applies it to the confirmed workspace and informs the Board.

### Local optimistic projection

`issueMove.ts` contains the example's pending-move Schema and pure Workspace projection. There is one pending move at a time. Displaying the projection moves the card immediately without changing confirmed data. A successful Command applies the acknowledged placement and clears the pending move. Failure removes the projection and retains the requested placement for retry. Incoming comments and saved fields update confirmed data underneath the projection, so failure does not restore an old copy over them.

This deliberately small helper has no queue, offline persistence, or confirmation protocol for remote activity. Command completion confirms the move. It is application-local scaffolding for the proposed [`foldkit/optimistic` module](https://github.com/foldkit/foldkit/issues/1474), which is not implemented here. The projection boundary can be replaced when that module is available; repository revision and conflict policy remain application-owned.

## File structure

- `domain/` contains shared Schemas, deterministic seed data, pure issue-result transformations, the native exit-warning Stream used by the root and Project Settings, and the navigation link helper shared by the sidebar and project tabs.
- `services.ts` implements the `WorkspaceRepository` Effect Service: its inputs and errors, stored-state and identity helpers, the pure transitions its handlers apply atomically, and the `ApplicationLayer` that provides it.
- `application.ts` is the root `Application` Block: its Model, Messages, and Commands, the selectors and issue links over application state, the Steps that apply issue data and inform retained children, teammate-activity policy, the view (sidebar navigation, saved views and retained drafts, the workspace page, and the demo controls), the `SimulateSaveFailure` Command, and `ApplicationLive`, which creates every child instance, folds their OutMessages, handles Commands, runs the activity and page-exit Subscriptions, and provides every child Block's Layer. `entry.ts` hosts it with `Program.make`, provides application Services, and starts the Runtime.
- `route.ts` owns Route Schemas, Foldkit routers, typed filter search params, and issue selection in the URL.
- `issueMove.ts` owns the pending board move, its projection, the `MoveIssue` Command, and the retry control.
- `issueList.ts`, `createIssue.ts`, `commandPalette.ts`, `memberDirectory.ts`, `notificationCenter.ts`, `issueBoard.ts`, and `projectSettings.ts` each hold one feature Block: its Model, Messages, OutMessages, Commands, update, view, and `Live` Layer, which provides the UI Blocks it creates.
- `issueDetail/` holds the issue editor Block and the Comment Composer Block only it uses.
- `listbox.ts` specializes the shared UI Block and builds consistent inert trigger/option content. Each owning Block creates its own Listbox instances and handles their selections.
- `styles.css` owns shared control appearance as Tailwind component classes. Feature views use those semantic class names instead of copying recipes or importing a sibling feature's view helpers.
- Board drop handling and keyboard announcements live with its DragAndDrop OutMessage handlers in `issueBoard.ts`, beside the drag identities shared by those handlers and the view. Their application behavior is covered in `issueBoard.story.test.ts`.

The dependency direction is domain and services → child Blocks → root Block → browser entry. Dialog, Animation, DragAndDrop, and Comment Composer supply deeper levels of composition and exercise child Mounts, Subscriptions, and lifecycle handlers.

See the website's [Project Organization guide](https://foldkit.dev/project-organization) for the conventions this example follows. This application supplies the concrete reference for [#1441](https://github.com/foldkit/foldkit/issues/1441), rather than introducing a separate organization pattern.

## Verification and scale

```sh
pnpm --filter workspace-example typecheck
pnpm --filter workspace-example test
pnpm --filter workspace-example exec vite build
```

Root update Stories live in `src/story/`, one file each for navigation, child policies, notifications, project settings, retained drafts, Board moves, and refresh behavior. `src/application.fixture.ts` holds their shared helpers. Feature Stories and Scenes live beside their Block. Stories assert Model changes, Commands, and OutMessages; Scenes exercise rendered interactions. Focused unit tests cover the repository Service and pure routing or domain policies. Browser tests live in `packages/examples-e2e/e2e/workspace.spec.ts` and cover actual Runtime admission of delayed results, Subscription timing, keyboard shortcuts, and the page-exit warning.

[#1767](https://github.com/foldkit/foldkit/issues/1767) also measures compiler and editor behavior. The existing framework benchmark infrastructure has a Workspace scenario and separate generated fixtures that vary distinct static compositions. Adding issue records alone does not measure TypeScript scaling. Record compiler/server versions, source hashes, workload sizes, and repeated results before comparing changes. Sampled process memory does not establish long-session memory stability.

The demo's teammate-activity selection lives in `application.ts`; it is deterministic parent policy over the current workspace. Repository effects remain in Commands, and the activity timer remains a Subscription. Notification presentation uses Effect DateTime and Duration with the Model's clock value.

The [application simplification](../../internal/workspace-simplification-20261025.md) records the subsequent removal of navigation-during-drag orchestration, consolidation of Route helpers, and root Story organization.
