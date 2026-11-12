---
'foldkit': patch
---

`Subscription.lift` now runs `read` once per parent Model for the whole lifted record instead of once per entry. Before, every lifted entry called `read` itself on every Model change, so a `read` that derives its child Model (merging parent fields, indexing a list, resolving shared context) ran once per entry per Message: an app lifting a few hundred entries through such a `read` paid that cost a few hundred times per Message. Entries that read the same parent Model object now share the child Model `read` returned, kept in a `WeakMap` for as long as that parent Model is alive. `read` must be a pure projection of the parent Model: every entry now receives the child Model returned by the first `read` of that parent Model object. A slow `read` is reported as slow dependencies under the key of whichever entry read that Model first, rather than under every entry. `when` gates, `None` teardown and the lifted dependency shapes are unchanged.
