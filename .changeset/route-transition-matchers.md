---
'foldkit': minor
---

Add `Transition.match` and `Transition.matchOrElse` for route entry, exit, stay, and unrelated policies with payloads narrowed to the selected Route tag. Both support a shared return type for composing Steps, including Command requirements and OutMessages. Add `Transition.isExiting` and `Transition.isStaying` predicates.
