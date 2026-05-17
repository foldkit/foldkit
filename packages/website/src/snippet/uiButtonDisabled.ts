// Pseudocode — Button is view-only. A disabled button still needs an
// onClick Message for the view config; it just won't fire.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Ui.Button.view({
    isDisabled: true,
    toView: attributes =>
      h.button(
        [
          ...attributes.button,
          h.Class('px-4 py-2 rounded-lg bg-gray-300 text-gray-500'),
        ],
        ['Disabled'],
      ),
  })
}
