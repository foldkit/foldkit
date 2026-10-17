import { modifyFields } from 'foldkit/struct'

const update = CounterComposition.makeUpdate((model, message) =>
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
