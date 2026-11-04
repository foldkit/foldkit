// ❌ Bad
// The authored update receives a wrapper that belongs to the child Binding.
const BadDialogBinding = ApplicationBlock.makeBinding(Dialog.block, {
  field: 'dialog',
  toParentMessage: message => Message.GotDialogMessage({ message }),
  fromParentMessage: false,
})

const badUpdate = ApplicationComposition.makeUpdate({
  GotDialogMessage: (model, { message }) =>
    BadDialogBinding.fold(model, message),
  ClickedSave: ApplicationBlock.makeNoopStep(),
})

// ✅ Good
// Composition derives delivery from the registered Binding.
const DialogBinding = ApplicationBlock.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
})

const update = ApplicationComposition.makeUpdate({
  ClickedSave: ApplicationBlock.makeNoopStep(),
})
