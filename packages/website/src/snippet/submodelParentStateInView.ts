import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import type { User } from '../user'
import type { Message } from './message'
import type { Model } from './model'

// The child declares the parent state it needs via the third type
// parameter on `Submodel.defineView`. The view receives it as
// `viewInputs` alongside `model`.
type ViewInputs = Readonly<{
  currentUser: User
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { currentUser }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        h.h2([], [`Settings for ${currentUser.name}`]),
        // ...rest of the Settings UI driven by `model`
      ],
    )
  },
)

// Inside the parent's view, slice currentUser out of the parent Model
// and pass it through viewInputs. Rebuilt every render, so the child always
// sees the current value:
h.submodel({
  slotId: 'settings',
  model: model.settings,
  view: Settings.view,
  viewInputs: {
    currentUser: model.currentUser,
  },
  toParentMessage: message => GotSettingsMessage({ message }),
})
