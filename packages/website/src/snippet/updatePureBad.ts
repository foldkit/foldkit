import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import type { Model } from './model'

// ❌ Don't do this in update
const update = ApplicationComposition.makeUpdate({
  OpenedDialog: model => {
    document.querySelector<HTMLInputElement>('#search-input')?.focus()
    return { model: modifyFields(model, { dialogState: () => 'Open' }) }
  },
})
