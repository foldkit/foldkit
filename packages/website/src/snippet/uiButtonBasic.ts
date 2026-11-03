// Pseudocode — Button is view-only. Replace ClickedSave() with your own
// Message constructor.
import type { HtmlBuilder } from 'foldkit/html'

import { view as buttonView } from '@foldkit/ui/button'

const view = (h: HtmlBuilder<Message>) =>
  buttonView(
    {
      onClick: ClickedSave(), // your Message
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class('px-4 py-2 rounded-lg bg-blue-600 text-white'),
          ],
          ['Save'],
        ),
    },
    h,
  )
