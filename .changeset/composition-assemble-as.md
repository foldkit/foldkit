---
'foldkit': minor
---

Add `Composition.assembleAs`, which completes a Composition against an exact implementation contract instead of inferring the completed Block from the implementation. Call it with the contract type, then with the implementation: `const assembled = Composition.assembleAs<Implementation>()({ init, update, view, EffectsLayer })`.

The returned Block type is computed from the contract, so editor requests that read the Block no longer re-infer the whole implementation. The implementation is still checked: every channel must equal the contract's channel in both directions, and the same initialization, view, registration, handler, and Layer validation as `assembleBlock` applies. A contract that declares a requirement, Service, or init argument the implementation lacks is rejected, as is one that omits something the implementation needs. At runtime `assembleAs` returns the same Block as `assembleBlock`.

`assembleBlock` is unchanged and remains the default. `assembleAs` suits large root Blocks whose contract is generated from the registered graph, as the Website now does for its root and Ui Blocks.

Also declare the Html element function aliases contravariant in their Message and Mount requirement parameters and give `replaceEffectsLayer` a named callable type, which lets the compiler reuse those relations instead of re-expanding them.
