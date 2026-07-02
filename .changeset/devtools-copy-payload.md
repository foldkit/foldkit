---
'@foldkit/devtools': minor
---

Add a copy-to-clipboard control to each inspectable payload in the DevTools
overlay. The Model snapshot, the inspected Message, and each displayed Command
now show a small icon button in their header that copies the payload as
fully-expanded, formatted JSON. The copied text is serialized from the
underlying data, so it includes every field regardless of which tree nodes are
collapsed in the inspector. The clipboard write runs in a `CopyPayloadToClipboard`
Command, dispatched from a `ClickedCopyPayload` Message.
