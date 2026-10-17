const view = ApplicationComposition.makeView((model, h) => ({
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
          // The Runtime dispatches this Message when the button is clicked.
          h.button(
            [h.OnClick(Message.ClickedDecrement()), h.Class(buttonStyle)],
            ['-'],
          ),
          h.button(
            [h.OnClick(Message.ClickedReset()), h.Class(buttonStyle)],
            ['Reset'],
          ),
          h.button(
            [h.OnClick(Message.ClickedIncrement()), h.Class(buttonStyle)],
            ['+'],
          ),
        ],
      ),
    ],
  ),
}))

const containerStyle =
  'min-h-screen bg-cream flex flex-col items-center justify-center gap-6 p-6'

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
