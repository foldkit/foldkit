import { Class, Html, OnClick, button, div } from '../html'

// VIEW

const view = (model: Model): Html =>
  div(
    [Class(containerStyle)],
    [
      div(
        [Class('text-6xl font-bold text-gray-800')],
        [model.count.toString()],
      ),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          // OnClick takes a Message, not a callback. The Message doesn't
          // execute anything — it just declares what should happen on click.
          // Foldkit dispatches it to your update function.
          button([OnClick(ClickedDecrement()), Class(buttonStyle)], ['-']),
          button([OnClick(ClickedReset()), Class(buttonStyle)], ['Reset']),
          button([OnClick(ClickedIncrement()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const containerStyle =
  'min-h-screen bg-cream flex flex-col items-center justify-center gap-6 p-6'

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
