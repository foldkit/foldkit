// ❌ Bad
// The authored update receives a wrapper that belongs to the child Binding.
import { makeRequiredFieldBinding, makeNoopStep } from './block'

const BadDialogBinding = makeRequiredFieldBinding(Dialog.block, {
  field: 'dialog',
  toParentMessage: message => Message.GotDialogMessage({ message }),
  fromParentMessage: false,
})

const badUpdate = ApplicationComposition.makeUpdate({
  GotDialogMessage: (model, { message }) =>
    BadDialogBinding.fold(model, message),
  ClickedSave: makeNoopStep(),
})

// ✅ Good
// Composition derives delivery from the registered Binding.
const DialogBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
  field: 'dialog',
})

const update = ApplicationComposition.makeUpdate({
  ClickedSave: makeNoopStep(),
})
