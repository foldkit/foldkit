// ❌ Bad
// The authored update receives a wrapper that belongs to the child Binding.
import { makeBinding, makeNoopStep } from './block'

const BadDialogBinding = makeBinding(Dialog.block, {
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
const DialogBinding = makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
})

const update = ApplicationComposition.makeUpdate({
  ClickedSave: makeNoopStep(),
})
