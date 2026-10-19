import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => {
      const nextCount = model.count + 1

      return {
        model: modifyFields(model, { count: () => nextCount }),
        commands: [PersistCount({ count: nextCount })],
      }
    },
    CompletedPersistCount: () => ({ model }),
  })
