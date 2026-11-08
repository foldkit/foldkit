---
'@foldkit/ui': minor
'@foldkit/devtools': patch
'@foldkit/oxlint-plugin': patch
'create-foldkit-app': patch
---

**Breaking:** Declare Menu, Tabs and RadioGroup selection values with runtime Schemas. Replace `Menu.makeBlock<Action>()`, `Tabs.makeBlock<Tab>()` and `RadioGroup.makeBlock<Plan>()` with `Menu.makeBlock(Action)`, `Tabs.makeBlock(Tab)` and `RadioGroup.makeBlock(Plan)`, passing the corresponding Schema value. Calling `makeBlock()` declares unrestricted strings.

The selected-value Codec now supplies the actual local selection Messages, OutMessages and generated parent Message envelopes. Constructors infer the exact decoded type, synchronous transformations retain their encoded representation, and invalid values fail runtime decoding. Values must decode to strings; Codecs must be service-free and execute synchronously when Foldkit serializes them.

Selection stays parent-owned. Views, indices, keyboard and pointer interactions, initialization and existing construction Layers retain their behavior. Declare each factory result once at module scope and provide `Menu.layer`, `Tabs.layer` or `RadioGroup.layer`. The module-scope selection-factory lint rule now covers RadioGroup too.
