import { Class, Html, OnClick, button, div } from '../html'

// VIEW - Renders your state as HTML
// Pure function: same state always produces the same HTML — no side effects

const view = (model: Model): Html =>
  div(
    [Class(containerStyle)],
    [
      div(
        [Class('text-6xl font-bold text-gray-800')],
        [model.toString()],
      ),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          // OnClick takes a Message, not a callback. The Message doesn't
          // execute anything — it just declares what should happen on click.
          // Foldkit dispatches it to your update function.
          button([OnClick(Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Reset()), Class(buttonStyle)], ['Reset']),
          button([OnClick(Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const containerStyle =
  'min-h-screen bg-cream flex flex-col items-center justify-center gap-6 p-6'

const buttonStyle =
  'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
