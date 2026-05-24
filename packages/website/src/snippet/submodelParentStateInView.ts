// The child's view declares the parent state it needs via the third
// type parameter on `Submodel.defineView`. The parent slices that
// state out of its own Model on every render and passes it through
// `inputs` on `h.submodel`.
import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import type { User } from '../user'
import type { Message } from './message'
import type { Model } from './model'

type Inputs = Readonly<{
  currentUser: User
}>

export const view = Submodel.defineView<Model, Message, Inputs>(
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
// and pass it through inputs. Rebuilt every render, so the child always
// sees the current value:
h.submodel({
  id: 'settings',
  view: Settings.view,
  model: parentModel.settings,
  inputs: {
    currentUser: parentModel.currentUser,
  },
  toParentMessage: message => GotSettingsMessage({ message }),
})
