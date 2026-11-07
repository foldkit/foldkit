import { Match } from 'effect'
import { type Block, Update } from 'foldkit'

import {
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeStep,
} from './block'
import { AppTabsBlock, TABS_ID, type Tab } from './model'
import { postQuery, postsQuery, statsQuery } from './query'

export const PostsBinding = makeRequiredFieldBinding(postsQuery, {
  field: 'posts',
})

export const StatsBinding = makeRequiredFieldBinding(statsQuery, {
  field: 'stats',
})

export const PostDetailsBinding = makeRequiredFieldBinding(postQuery, {
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

export const TabsBinding = makeRequiredFieldBinding(AppTabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: TABS_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(AppTabsBlock, {
    Selected: ({ value }) => activateTab(value),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [TabsBinding, PostsBinding, StatsBinding, PostDetailsBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
