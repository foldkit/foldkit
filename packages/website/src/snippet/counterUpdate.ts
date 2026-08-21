import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedDecrement: () => ({
      model: evo(model, { count: count => count - 1 }),
    }),
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
    ClickedReset: () => ({ model: evo(model, { count: () => 0 }) }),
  })
