const enterStatsRoute = Application.step(model =>
  Option.match(AsyncData.loadIfMissing(model.stats), {
    onNone: () => ({ model }),
    onSome: loadingStats => ({
      model: modifyFields(model, { stats: () => loadingStats }),
      commands: [LoadStats()],
    }),
  }),
)
