import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => {
      const nextCount = model.count + 1

      return {
        model: evo(model, { count: () => nextCount }),
        commands: [PersistCount({ count: nextCount })],
      }
    },
    CompletedPersistCount: () => ({ model }),
  })
