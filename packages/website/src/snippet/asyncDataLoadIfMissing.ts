const enterStatsRoute = (model: Model): Update.Return<Model, Message> =>
  Option.match(AsyncData.loadIfMissing(model.stats), {
    onNone: () => ({ model }),
    onSome: loadingStats => ({
      model: evo(model, { stats: () => loadingStats }),
      commands: [LoadStats()],
    }),
  })
