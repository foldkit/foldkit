import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const enterStatsRouteStep = (model: Model) =>
  Option.match(AsyncData.loadIfMissing(model.stats), {
    onNone: () => ({ model }),
    onSome: loadingStats => ({
      model: modifyFields(model, { stats: () => loadingStats }),
      commands: [LoadStats()],
    }),
  })
