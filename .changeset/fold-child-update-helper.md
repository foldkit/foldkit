---
'foldkit': minor
---

Add `Update.foldChild`, the update half of embedding a child Submodel. It takes the facts that vary per child (the child entry point, an `Option`-returning `read`, `write`, `toParentMessage`, and `foldOutMessage` for children that raise OutMessages) and returns a function from the child input to an `Update.Step`, so a parent's `Got*` handler collapses to one line and the fold composes with `Update.combine`. When `read` returns `None` the fold is a no-op, matching the hand-written convention for unmounted children. Commands are lifted through `toParentMessage` with `Command.mapMessages`, so DevTools attribution and Story/Scene resolution keep working unchanged.
