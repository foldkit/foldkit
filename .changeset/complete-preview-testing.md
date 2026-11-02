---
'foldkit': minor
---

`Story.message` accepts a Message while earlier Commands remain pending. It keeps those Commands and appends the new ones without running stored resolvers. Resolve each Command explicitly before the Story ends; a Story with unresolved Commands or ambiguous matches still fails. Scene keeps its existing pending Command and Mount checks.
