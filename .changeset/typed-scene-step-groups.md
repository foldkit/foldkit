---
'foldkit': minor
---

Add `Scene.steps` to compose reusable groups of Scene steps without arrays or spread, matching `Story.steps`. Groups can nest, preserve their Model, Message, and OutMessage constraints, and render the view after each child step. Command and Mount resolution, Subscription Messages, and OutMessage assertions follow the same rules inside a group as they do at the top level.
