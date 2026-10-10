const enterStatsRoute = Update.makeStep((model: Model) =>
  Option.match(AsyncData.loadIfMissing(model.stats), {
    onNone: () => ({ model }),
    onSome: loadingStats => ({
      model: modifyFields(model, { stats: () => loadingStats }),
      commands: [LoadStats()],
    }),
  }),
)
