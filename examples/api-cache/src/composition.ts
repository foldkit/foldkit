import { Match, Option } from 'effect'
import { AsyncData, type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchPosts, FetchStats } from './command'
import { Application } from './definition'
import { Message } from './message'
import {
  ApplicationTabs,
  type Model,
  type PostsData,
  type StatsData,
  TABS_ID,
  type Tab,
} from './model'

export const applyPostsTransition = (
  model: Model,
  maybeNextPosts: Option.Option<PostsData>,
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
  maybeNextStats: Option.Option<StatsData>,
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

const foldTabsOutMessage = ApplicationTabs.OutMessage.match({
  Selected: ({ value }) => Application.step(activateTab(value)),
})

export const TabsBinding = Application.bindChild(ApplicationTabs, {
  field: 'tabs',
  parentMessage: Message.GotTabsMessage,
  init: { args: () => [{ id: TABS_ID }] },
  outMessage: { fold: foldTabsOutMessage },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [TabsBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
