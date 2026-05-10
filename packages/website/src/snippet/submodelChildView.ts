// page/settings.ts
import { type Html, html } from 'foldkit/html'

import { ChangedTheme, type Message } from './message'
import type { Model } from './model'

// The child's view is generic over <ParentMessage>. It binds h locally
// from html<ParentMessage>(), so its tags and event constructors are
// typed against whatever Message union the parent dispatches against,
// not against the child's own Message. The toParentMessage callback is
// how child Messages cross the boundary.
export const view = <ParentMessage>(
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-xl font-bold')], ['Settings']),
      h.button(
        [h.OnClick(toParentMessage(ChangedTheme({ theme: 'dark' })))],
        ['Use dark theme'],
      ),
    ],
  )
}
