# Workspace Binding writer cleanup

- [x] Expose keyboard pickup/target facts from DragAndDrop; preserve focus and reorder/cancellation behavior.
- [x] Move Workspace, Kanban, and Website keyboard announcements from Binding writers into OutMessage policies.
- [x] Keep Workspace accepted-move and rollback announcements in Message-backed Board operations invoked by the parent.
- [x] Add conservative provenance-based lint coverage, accepted custom storage cases, and active guidance.
- [x] Verify source/emitted contracts, runtime/Story behavior, lint integration, and affected consumers.

Review limits: lint targets direct Option.some field reads and modifyFields writes with a direct next-child placement plus a sibling dependency. More complex/indirect writers require review. No claim of universal enforcement.

Verification: 60 DragAndDrop tests, 146 Workspace tests, 22 Kanban tests, and 64 lint integration/configuration tests passed. UI source and relocated emitted-declaration checks passed. Workspace, Kanban, UI Showcase, Website, and lint-plugin typechecks passed. The real lint fixture check covers valid direct/nested/optional/keyed storage; invalid direct writers and immutable aliases produce exact diagnostics. App lint, targeted Effect lint, formatting, and diff checks passed. The consumer writer audit excludes walkthrough snippet files that deliberately combine incomplete or before/after declarations.

Evidence directory: `/private/tmp/foldkit-binding-writer-policy-20261024`. Changes remain local to the shared checkout and are not committed or pushed by this side conversation.
