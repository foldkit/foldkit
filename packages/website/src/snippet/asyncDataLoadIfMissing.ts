const enterStatsRoute = (model: Model): readonly [Model, Commands] =>
  Option.match(AsyncData.loadIfMissing(model.stats), {
    onNone: () => [model, []],
    onSome: loadingStats => [
      evo(model, { stats: () => loadingStats }),
      [LoadStats()],
    ],
  })
