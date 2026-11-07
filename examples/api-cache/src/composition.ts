import { Match, Option } from 'effect'
import { AsyncData, type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  makeComposition,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeStep,
} from './block'
import { FetchPosts, FetchStats } from './command'
import {
  ApplicationTabsBlock,
  type Model,
  type PostsData,
  type StatsData,
  TABS_ID,
  type Tab,
} from './model'

export const applyPostsTransition = (
  model: Model,
  maybeNextPosts: Option.Option<typeof PostsData.schema.Type>,
) =>
  Option.match(maybeNextPosts, {
    onNone: () => ({ model }),
    onSome: nextPosts => ({
      model: modifyFields(model, { posts: () => nextPosts }),
      commands: [FetchPosts()],
    }),
  })

export const applyStatsTransition = (
  model: Model,
  maybeNextStats: Option.Option<typeof StatsData.schema.Type>,
) =>
  Option.match(maybeNextStats, {
    onNone: () => ({ model }),
    onSome: nextStats => ({
      model: modifyFields(model, { stats: () => nextStats }),
      commands: [FetchStats()],
    }),
  })

const activateTab = (tab: Tab) => (model: Model) => {
  const modelWithActiveTab = modifyFields(model, { activeTab: () => tab })

  return Match.value(tab).pipe(
    Match.when('Posts', () =>
      applyPostsTransition(
        modelWithActiveTab,
        AsyncData.loadIfMissing(modelWithActiveTab.posts),
      ),
    ),
    Match.when('Stats', () =>
      applyStatsTransition(
        modelWithActiveTab,
        AsyncData.loadIfMissing(modelWithActiveTab.stats),
      ),
    ),
    Match.exhaustive,
  )
}

export const TabsBinding = makeRequiredFieldBinding(ApplicationTabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: TABS_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ApplicationTabsBlock, {
    Selected: ({ value }) => makeStep(activateTab(value)),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [TabsBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
