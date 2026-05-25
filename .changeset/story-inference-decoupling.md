---
'foldkit': minor
---

`Story` testing helper signatures decoupled from the simulation's `Message` / `OutMessage` to fix type inference when an update returns the 3-tuple `[Model, Commands, Option<OutMessage>]`. The previous generic signatures inferred the simulation type from the helper argument, which broke variance for narrow argument values (e.g. `expectOutMessage(SpecificVariant({...}))` against a wider OutMessage union) and collapsed `Model` and `Message` to `unknown` across every step.

### What changed

- `Story.expectOutMessage` no longer infers its narrowing from the expected argument. The runtime equality check still surfaces wrong-payload mismatches.
- `Story.message` no longer narrows the simulation's `Message` parameter from the argument.
- `Story.model` is now a function returning a branded `ModelStep<Model>` tagged object instead of a generic curried function. The story loop interprets `ModelStep` alongside the other step variants. `Model` flows contextually from the story's update function, so test files no longer need per-call annotations like `Story.model((model: Model) => ...)`.
- `StoryStep<Model, Message, OutMessage>` collapsed to `StoryStep<Model>`. The narrower generics aren't load-bearing on the step union since each step variant either uses `any` for its sim type or carries its own generic.

### Migration

For most consumers this is source-compatible. The annotation-on-`Story.model` pattern can be dropped:

```ts
// Before
Story.story(
  update,
  Story.with(initialModel),
  Story.message(ClickedIncrement()),
  Story.model((model: Model) => {
    expect(model.count).toBe(1)
  }),
)

// After
Story.story(
  update,
  Story.with(initialModel),
  Story.message(ClickedIncrement()),
  Story.model(model => {
    expect(model.count).toBe(1)
  }),
)
```

Direct uses of `StoryStep<A, B, C>` need to be rewritten as `StoryStep<A>`. The other two type parameters had no remaining call sites that benefited from the narrower signature.
