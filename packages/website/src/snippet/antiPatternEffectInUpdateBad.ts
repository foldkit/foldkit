// ❌ Bad: update performs a DOM effect during the state transition.

import { modifyFields } from 'foldkit/struct'

const update = ApplicationComposition.makeUpdate({
  ClickedOpenDialog: model => {
    document.querySelector<HTMLInputElement>('#search-input')?.focus()

    return { model: modifyFields(model, { dialogState: () => 'Open' }) }
  },
})
