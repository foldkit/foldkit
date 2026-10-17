import { ApplicationComposition } from './composition'
import { Message } from './message'

// ✅ Keep view pure
const view = ApplicationComposition.makeView((model, h) => ({
  title: model.title,
  body: h.div(
    [h.Class('container')],
    [
      h.h1([], [model.title]),
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['+']),
    ],
  ),
}))
