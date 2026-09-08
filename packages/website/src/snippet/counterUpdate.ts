import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

// UPDATE

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedDecrement: () => ({
      model: evo(model, { count: count => count - 1 }),
    }),
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
    ClickedReset: () => ({ model: evo(model, { count: () => 0 }) }),
  })
