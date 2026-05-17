// Pseudocode — Button is view-only. Replace ClickedSave() with your own
// Message constructor.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Ui.Button.view({
    onClick: ClickedSave(), // your Message
    toView: attributes =>
      h.button(
        [
          ...attributes.button,
          h.Class('px-4 py-2 rounded-lg bg-blue-600 text-white'),
        ],
        ['Save'],
      ),
  })
}
