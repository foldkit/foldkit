---
'foldkit': minor
---

Add an optional InMessage contract for parent requests, with an exhaustive `Composition.makeReceive` record separate from local update. Definition Step helpers infer the selected input payload while Commands continue to produce local Messages.

```ts
const InMessage = defineMessageUnion({
  RequestedClear: {},
  InformedOfDraftChanged: { text: Schema.String },
})
type InMessage = typeof InMessage.Type

const receive = MessageComposerComposition.makeReceive({
  RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
  InformedOfDraftChanged: makeFieldsStep.fromMessage(({ text }) => ({
    text: () => text,
  })),
})
```

Declare `InMessage` beside `Model` and `Message` in `Block.makeDefinition`, then return `receive` from its `makeBlock` constructor. Bindings generate `requestClear()` and `informDraftChanged({ text })` from those input names. Local Message and InMessage tags must be distinct. Input handlers remain pure and synchronous; they return Model changes, Commands, and optional OutMessages through the existing child policies and occurrence lifecycle.

Public `inMessageOutputs` declarations specify an input's permitted OutMessage, extra Services, and resource requirements. Omitted entries are silent. `makeReceive.withContext` uses a separate optional `InMessageContext` tuple. Acquired receivers support direct and curried calls with exact per-input channels. Existing explicit operation declarations remain available for positional and generic adapters.

Use `Story.inMessage(input)` and `Scene.inMessage(input)` in scoped Block tests. Their Commands remain pending for normal resolution through local update. Input-only Blocks can keep `Message: Schema.Never`, `isMessageFree: true`, and `makeUpdate({})` without inventing a local Message.

Family contracts expose the same input Schema and reserve the member name `InMessage`, alongside `Model`, `Message`, and `OutMessage`. Family-specific members cannot override those protocol fields.
