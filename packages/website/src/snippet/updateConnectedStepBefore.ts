import { DialogBinding } from './composition'
// ❌ Apply a connected Binding operation to an ordinary domain Model.
import { type Model } from './model'

export const closeDialog = (model: Model) => DialogBinding.requestClose()(model)
