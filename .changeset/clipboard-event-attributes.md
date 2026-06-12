---
'foldkit': minor
---

Add clipboard event attributes with synchronous clipboardData access. `OnPastePreventDefault` hands the handler the clipboard's text/plain payload; returning `Some` suppresses the browser's default insertion and dispatches the Message, returning `None` lets the browser paste normally. `OnCopyText` and `OnCutText` write Model-derived text to the clipboard inside the gesture and suppress the default payload; the cut variant also dispatches a Message so update can remove the cut content from the Model.
