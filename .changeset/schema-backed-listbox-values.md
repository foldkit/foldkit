---
'@foldkit/ui': minor
'create-foldkit-app': patch
---

**Breaking:** Declare Listbox selection values with a runtime Schema in both Single and Multi factories. Replace generic-only calls with `Listbox.makeBlock(Value)` or `Listbox.Multi.makeBlock(Value)`. For object rendering items, pass their Schema and the selected-value Schema separately: `Listbox.makeBlock(Item, Value)`. `makeBlock()` declares unrestricted string items and values.

```ts
const Status = Schema.Literals(['Todo', 'Done'])
type Status = typeof Status.Type
const StatusOption = Schema.Struct({ label: Schema.String, value: Status })
type StatusOption = typeof StatusOption.Type

const StatusListboxBlock = Listbox.makeBlock(Status)
const StatusOptionListboxBlock = Listbox.makeBlock(StatusOption, Status)
```

The Value Codec now validates `RequestedSelectItem.item`, `SelectedItem.item`, and `Selected.value`, including selection inside generated parent Message envelopes. Its encoded representation is preserved for synchronous transformations. Value Codecs must be service-free; asynchronous transformations are rejected when Foldkit serialization executes them. The Item Schema supplies view typing only and adds no serialization or Service requirements.

Pass `itemToValue` when rendering objects or mapping other item types into Values. Omit the extractor when the supplied items already satisfy the Value type. Selection stays parent-owned. Provide `Listbox.layer` or `Listbox.Multi.layer` to construct the corresponding family; each specialization retains its exact Schema and graph identity.
