// Before: the constructor ran once per instance and closed over its args.
export const CounterLive = Counter.make(
  Effect.fn(function* (id, { max }) {
    const countStore = yield* CountStore

    return {
      model: { count: 0 },

      update: {
        ClickedIncrement: model => {
          const nextModel = modifyFields(model, { count: Number.increment })

          if (nextModel.count === max) {
            return {
              model: nextModel,
              outMessage: Counter.OutMessage.ReachedMax(),
            }
          } else {
            return { model: nextModel }
          }
        },
        ClickedSave: model => ({
          model,
          commands: [SaveCount({ count: model.count })],
        }),
        CompletedSaveCount: model => ({ model }),
      },

      commands: {
        SaveCount: ({ count }) =>
          countStore
            .save(id, count)
            .pipe(
              Effect.ignore,
              Effect.as(Counter.Message.CompletedSaveCount()),
            ),
      },

      view: (model, h) =>
        h.button(
          [h.OnClick(Counter.Message.ClickedIncrement())],
          [`${id}: ${model.count}/${max}`],
        ),
    }
  }),
)

export const BoardLive = Board.make(
  Effect.fn(function* () {
    const pinned = yield* new Counter('pinned', { max: 10 })
    const row = yield* Counter.each('rows', { max: 3 })

    return {
      model: { pinned, rows: [], nextRowId: 0, completedCount: 0 },

      update: {
        ClickedAddRow: model => ({
          model: modifyFields(model, {
            rows: Array.append(row(`row-${model.nextRowId}`)),
            nextRowId: Number.increment,
          }),
        }),
        ...pinned.on({
          ReachedMax: model => ({
            model: modifyFields(model, { completedCount: Number.increment }),
          }),
        }),
        ...row.on({
          ReachedMax: (model, _outMessage, counter) => ({
            model: modifyFields(model, {
              rows: Array.filter(({ id }) => id !== counter.id),
            }),
          }),
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            model.pinned.view(),
            ...Array.map(model.rows, counter => counter.view()),
          ],
        ),
    }
  }),
)
