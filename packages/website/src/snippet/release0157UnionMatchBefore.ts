// Before: preserving Plan requires a separate Effect Match pipeline.
const foldListboxOutMessage = Match.type<Listbox.OutMessage<Plan>>().pipe(
  Match.withReturnType<Update.Step<Model, Message>>(),
  Match.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { maybePlan: () => Option.some(value) }) }),
  }),
)
