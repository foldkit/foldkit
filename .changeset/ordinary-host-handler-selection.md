---
'foldkit': minor
---

Support explicit host-owned handlers on ordinary constructor-authored Blocks through `provideHandlers`.

List the original definitions in the constructor's `hostHandlers` and select their providers through the completed descriptor. Selection remains passive, preserves constructor scope cleanup and canonical child contracts, and checks provider Services and constructor errors against the Definition's effects contract. The independently declared effects bounds remain unchanged after selection.

Program, Story, Scene, and Server reject unresolved ordinary Blocks. Pure tests and SSR do not build selected handler Layers or require their Service mocks.

Also reject conditional provider Layers when any alternative omits a required host handler. This coverage check applies consistently to ordinary, native, and family Blocks.
