---
'foldkit': patch
---

Share a `Subscription.lift` projection across entries that read the same parent Model object or function. A projection that derives a child Model, such as indexing shared settings, runs once for that parent Model identity. Primitive parent Models are read separately for each entry. Keep `read` a pure projection of the parent Model. A slow projection is reported under the key of the first entry that reads that Model.
