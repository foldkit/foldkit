# Workspace adoption

Workspace's nine feature Blocks and Application root use independent public contracts and Layer-provided implementations. Parent Model and Composition modules import feature contracts; constructors acquire the selected child implementations. Deferred Binding initialization preserves each occurrence's existing configuration and startup behavior. Existing update, repository, concurrency, and view algorithms remain.

The migrated source, lint, production build, and all 154 existing tests pass. Advanced raw transition sequences acquire the actual root with `Story.withBlock` and use parent-bound test delivery. Selected-child mapping resolves a nested test Message through that root's child graph, preserving delivery provenance without acquiring an unrelated copy of the child.

`browser.mjs` tests the built application served on port 45970. It opens the initial issue list, opens and closes issue WSP-101, and navigates to the Experience board. `browser-result.json` records the successful production run with no page errors. This is a representative browser smoke check; the existing Story and Scene suites retain the detailed optimistic-update, routing, selection, and lifecycle assertions.
