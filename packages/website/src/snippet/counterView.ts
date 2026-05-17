import { type Document, html } from 'foldkit/html'

// VIEW

const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `Counter: ${model.count}`,
    body: h.div(
      [h.Class(containerStyle)],
      [
        h.div(
          [h.Class('text-6xl font-bold text-gray-800')],
          [model.count.toString()],
        ),
        h.div(
          [h.Class('flex flex-wrap justify-center gap-4')],
          [
            // OnClick takes a Message, not a callback. The Message doesn't
            // execute anything. It just declares what should happen on click.
            // Foldkit dispatches it to your update function.
            h.button(
              [h.OnClick(ClickedDecrement()), h.Class(buttonStyle)],
              ['-'],
            ),
            h.button(
              [h.OnClick(ClickedReset()), h.Class(buttonStyle)],
              ['Reset'],
            ),
            h.button(
              [h.OnClick(ClickedIncrement()), h.Class(buttonStyle)],
              ['+'],
            ),
          ],
        ),
      ],
    ),
  }
}

// STYLE

const containerStyle =
  'min-h-screen bg-cream flex flex-col items-center justify-center gap-6 p-6'

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
