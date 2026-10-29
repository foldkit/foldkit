---
'foldkit': minor
---

Scene now tracks each Mount by the element that carries it, using the renderer's own child matching, so a Scene test sees a Mount end and start again exactly when the renderer replaces its element. When an update changes the key, tag, `is` value, or view function of a Mount's element or of an ancestor, the renderer replaces the element: Scene ends the old Mount and makes the new element's Mount pending. When the renderer patches an element in place, the element keeps the Mount it was inserted with, even if its `OnMount` changes or is removed, and an `OnMount` added to a patched element never starts.

Before, Scene matched Mounts by name and position among same-named Mounts. A keyed element whose key changed looked unchanged, so `Mount.expectEnded` threw for the old Mount and `Mount.resolve` threw for the new one.

Breaking: some Scene tests need different Mount steps.

- After a step that replaces an element carrying a Mount, such as a keyed popover whose key changes, add `Mount.expectEnded` for the old Mount and `Mount.resolve` for the new one.
- Removing one of several keyed elements that render the same Mount ends that element's Mount, not the last same-named one. Update instance matchers in `Mount.expectEnded` to the removed element's args.
- Remove `Mount.resolve` and `Mount.expectEnded` steps for a Mount whose `OnMount` is added to or dropped from an element that stays rendered. For example, a `@foldkit/ui` Dialog opened with `Dialog.ShowDialog` never starts `Dialog.AcquireResources`, and closing a Dialog that started it does not end it:

```ts
// Before
Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
Mount.resolve(Dialog.AcquireResources, Dialog.Message.SucceededAcquireResources()),
click(role('button', { name: 'Dismiss' })),
Command.resolve(Dialog.CloseDialog, Dialog.Message.CompletedCloseDialog()),
Mount.expectEnded(Dialog.AcquireResources),

// After
Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
click(role('button', { name: 'Dismiss' })),
Command.resolve(Dialog.CloseDialog, Dialog.Message.CompletedCloseDialog()),
```
