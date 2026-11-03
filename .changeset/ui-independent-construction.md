---
'@foldkit/ui': minor
---

Separate stateful UI contracts from Layer-provided implementations. Keep public component names and generic factories such as `AnimationBlock`, `Listbox.makeBlock<Item, Value>()`, `Tabs.makeBlock<Tab>()`, `Menu.makeBlock<Action>()`, `RadioGroup.makeBlock<Value>()`, `VirtualList.makeBlock<Item>()`, `Slider.forRoot(getRoot)` and `Toast.makeBlock(Payload)`.

Import the component namespace, bind its passive contract, and provide the namespace's `layer` when completing the parent. Single and Multi variants each expose their own `layer`. Type-only specializations share one implementation provider; runtime specializations preserve their Schema or root callback through a checked family provider. Acquiring the graph does not initialize Models, run handlers or start occurrence lifecycles.

Listbox, Menu and Toast initialize their private Animation children through deferred Binding policies or typed dynamic Binding initialization. Existing selection ownership, keyboard behavior, focus Commands, Mount identities, animation timing and Subscription cleanup remain unchanged.

Library behavior tests acquire the implementation inside a scoped `Story.withBlock` fixture, then use ordinary synchronous Story and Scene steps. Applications can use the Block-aware `Story.story` and `Scene.scene` entry points directly. Public test namespaces retain their original Command and Mount definitions, and Toast's occurrence-aware `test.drainEntry` helper retains direct and keyed Binding support.
