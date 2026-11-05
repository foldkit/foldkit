---
'foldkit': minor
---

Rename public ManagedResource requirement lists to `managedResources` in Block `effects`, operation result contracts, and `inMessageOutputs`. Pass the original ManagedResource contracts in these lists. The old `resources` key is rejected in source, emitted consumers, and erased runtime declarations so it cannot silently drop a requirement.

Migration: replace `effects.resources` with `effects.managedResources`, and replace `operations.<name>.resources` and `inMessageOutputs.<tag>.resources` with `managedResources` at the same location. Keep each existing list entry unchanged; these are ManagedResource contracts, not replacement handlers or new instances.

Keep ordinary handler Services in `effects.services`, handler-Layer construction failures in `effects.Error`, and graph constructor requirements on the Effect passed to `makeLayer`. ManagedResource identity, registration and lifecycle behavior are unchanged.

Clarify the advanced `codec.decoding` and `codec.encoding` bounds for Services hidden behind opaque child Message delivery. Local Message Schema Services remain inferred, and normal Messages should use self-contained Codecs. DevTools external dispatch retains its decoder requirements and ordinary provider path.

Keep exported `makeFieldsStep` helpers nameable in TypeScript 6 declarations when their owning Block has no local Messages. The helper retains its exact Model, output and registration contracts when moved into a separate module.
