import { Match } from 'effect'
import { type Block, Update } from 'foldkit'

import { ApplicationBlock, makeFieldsStep, makeStep } from './definition'
import { AppTabsBlock, TABS_ID, type Tab } from './model'
import { postQuery, postsQuery, statsQuery } from './query'

export const PostsBinding = ApplicationBlock.makeBinding(postsQuery, {
  field: 'posts',
})

export const StatsBinding = ApplicationBlock.makeBinding(statsQuery, {
  field: 'stats',
})

export const PostDetailsBinding = ApplicationBlock.makeBinding(postQuery, {
  field: 'postDetails',
})

const activateTab = (tab: Tab) => {
  const selectTab = makeFieldsStep(() => ({
    activeTab: () => tab,
  }))

  const loadTab = Match.value(tab).pipe(
    Match.when('Posts', () => PostsBinding.requestLoadIfMissing()),
    Match.when('Stats', () => StatsBinding.requestLoadIfMissing()),
    Match.exhaustive,
  )

  return makeStep(() => Update.combineSteps([selectTab, loadTab]))
}

export const TabsBinding = ApplicationBlock.makeBinding(AppTabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: TABS_ID }] },
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(AppTabsBlock, {
    Selected: ({ value }) => activateTab(value),
  }),
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [TabsBinding, PostsBinding, StatsBinding, PostDetailsBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
