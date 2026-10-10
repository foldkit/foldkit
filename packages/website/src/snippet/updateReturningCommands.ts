import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedIncrement: () => {
      const nextCount = model.count + 1

      return {
        model: modifyFields(model, { count: () => nextCount }),
        commands: [PersistCount({ count: nextCount })],
      }
    },
    CompletedPersistCount: () => ({ model }),
  }),
)
