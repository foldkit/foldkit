## Next preview in preparation

The integration branch now contains the next Blocks + Effect Layers API. It is not published yet. The Ready announcement, package map, migration prompts and code walkthrough below still describe the verified `90746b32d2ca` snapshot.

This next round includes:

- One public `Block.make` declaration and record-form `makeLayer` completion, with portable typed builders and explicit child Bindings. Registered children are acquired internally when the Layer is built; custom Effect construction remains available.
- Storage-specific Binding constructors, `activeWhen` for retained child activity, `InitArgs` contracts, optional custom-constructor child acquisition, and one `foldkit/binding` helper import.
- Separate InMessage handling, generated `informOfX` notification methods, ordered update composition, and less keyed initialization and OutMessage wiring.
- Synchronous, service-free Block serialization and runtime-Schema-backed Listbox values.
- Scoped Story/Scene testing, checked nested `Story.messageIn` paths, ordered Command assertions, immutable Model observations, and precise keyed lifecycle selection.
- Lifecycle, Node response cancellation, Menu, DragAndDrop, Dialog, Query and SSR fixes, plus consistent adoption across the examples, Website and Typing Game.
- A DevTools fix for inspecting Effect Chunks without overflowing the stack, preserving nested secret masking and shared references.

The [prepared change description](https://github.com/foldkit/foldkit/blob/codex/layers-and-submodels/internal/preview-pr-next-release.md) and [release review](https://github.com/foldkit/foldkit/blob/codex/layers-and-submodels/internal/preview-release-review-20261106.md) distinguish required migrations, optional APIs and remaining limits. The final verification record documents the rendering/bundle gap and two moderate build-tool advisories. The authorized security review found no new security defect; its README finding is corrected. Protected integration and artifact verification precede publication.

The new Ready section will be generated from the actual published package manifest and verified immutable Website deployment. Until then, the installed snapshot and instructions below remain unchanged.

---
