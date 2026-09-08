// After: Foldkit's matcher preserves Plan directly.
const foldListboxOutMessage = Listbox.OutMessage.match<
  Update.Step<Model, Message>,
  Listbox.OutMessage<Plan>
>({
  Selected:
    ({ value }) =>
    model => ({ model: evo(model, { maybePlan: () => Option.some(value) }) }),
})
