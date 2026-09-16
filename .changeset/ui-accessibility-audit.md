---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': patch
---

Make modal Dialog backgrounds inert and hidden from assistive technology while keeping permitted overlays and Dialogs stacked above the modal available. Reconcile newly mounted portals and other late page content, coordinate stacked Dialogs, reacquire resources for an open Dialog restored by development Model preservation, and release Dialogs in topmost-first order when the owning runtime stops.

`Dialog.init()` now always creates a closed Dialog. Replace an initially open `Dialog.init()` call such as:

```ts
const dialog = Dialog.init({ id: 'confirm', isOpen: true })
```

with `Dialog.boot()`. Pass the boot result to `Update.foldChildInit`, construct the parent Model through `toParentModel`, map child Commands through `toParentMessage`, and handle the OutMessage through the same `foldDialogOutMessage` used by the parent update:

```ts
return Update.foldChildInit(Dialog.boot({ id: 'confirm' }), {
  toParentModel: dialog => ({ dialog }),
  toParentMessage: toGotDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})
```

This ensures an initially open Dialog acquires the same isolation, scroll lock, focus trap, stack registration, and cleanup as one opened later.

Because this Dialog resource path uses the updated `Dom.showDialog` contract, `@foldkit/ui` now requires `foldkit` 0.161.0 or newer.

Point UI controls at panels only while those panels are rendered, and keep an empty Combobox from exposing an invalid active descendant or expanded listbox. Keep the modal Combobox backdrop available for dismissal even when filtering leaves no list items. Render Toast containers and entries as neutral `<div>` elements so their live-region roles do not conflict with list semantics.

Export `DragAndDrop.DragState` so consumers can match drag phases through the tagged union API when deriving accessible announcements and other parent behavior.

Tabs defaults to active-only panel rendering when deciding which tabs receive `aria-controls`. Pass `panelMount: 'All'` when every tab panel remains mounted, including when inactive panels are hidden. DevTools opts into that strategy for its Inspector tabs.

Toast markup changes from `<ol>` and `<li>` to `<div>` elements. Update any element-selector CSS or DOM queries that target those Toast wrappers.

`Dom.showDialog` now resolves to `true` when it installs a Dialog's resources and `false` when that id already holds them. Callers that explicitly annotated its result as `void` must accept or ignore the boolean result.
