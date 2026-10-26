// ❌ Bad
// The authored update receives a wrapper that belongs to the child Binding.
const BadDialogBinding = ApplicationDefinition.makeBinding(Dialog.block, {
  field: 'dialog',
  toParentMessage: message => Message.GotDialogMessage({ message }),
  fromParentMessage: false,
})

const badUpdate = ApplicationComposition.makeUpdate({
  GotDialogMessage: (model, { message }) =>
    BadDialogBinding.fold(model, message),
  ClickedSave: ApplicationDefinition.makeNoopStep(),
})

// ✅ Good
// Composition derives delivery from the registered Binding.
const DialogBinding = ApplicationDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
})

const update = ApplicationComposition.makeUpdate({
  ClickedSave: ApplicationDefinition.makeNoopStep(),
})
