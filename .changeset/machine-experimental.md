---
'foldkit': minor
---

Add an experimental state machine module at `foldkit/experimental/machine`. The declarative transition table compiles to a plain transition function. Edge `build` and `commands` callbacks receive a single `{ state, message, guardValue }` input, so call sites destructure only what they use. A `when` guard either resolves the state and Message to an `Option` value that flows to its Edge as `guardValue`, or returns a plain boolean when there is nothing to extract. A new Checkout Machine example demonstrates guarded branches and edge Commands.
