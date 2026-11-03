// Pseudocode — Button is view-only. A disabled button still needs an
// onClick Message for the view config; it just won't fire.
import type { HtmlBuilder } from 'foldkit/html'

import { view as buttonView } from '@foldkit/ui/button'

const view = (h: HtmlBuilder<Message>) =>
  buttonView(
    {
      isDisabled: true,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class('px-4 py-2 rounded-lg bg-gray-300 text-gray-500'),
          ],
          ['Disabled'],
        ),
    },
    h,
  )
