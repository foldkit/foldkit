---
'foldkit': minor
'create-foldkit-app': patch
---

Add dynamic child storage helpers to `foldkit/bindingInit`:

- `initAndSet` replaces a required or optional direct child field, or an Option wrapper containing only its key and child fields. Custom unkeyed accessors may reuse an existing `init.toParentFields` projection.
- `initAndInsert` inserts an absent key into a Record or Effect HashMap storing child Models directly.

Both return passive Binding initialization recipes with exact arguments, lifted child Commands and registration requirements. Other parent fields retain their identity. Append and insert reject duplicate keys; ordinary child operations still never create absent children. Same-key reinitialization retains normal lifecycle semantics and does not cancel pending work.

Keep explicit `Binding.init` when creating additional wrapper metadata, changing sibling fields, adding parent Commands, replacing a map or array entry, or selecting an entire tagged parent variant. Scaffold guidance documents these choices alongside the existing `initAndAppend` helper.

Initialization helpers reject unions of different Bindings even when their placement and storage fields match. Narrow the Binding before constructing its initializer arguments; sharing storage does not make different init signatures interchangeable.
