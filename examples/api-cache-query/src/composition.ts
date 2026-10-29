import { Match } from 'effect'
import { type Block, Update } from 'foldkit'

import { ApplicationDefinition, makeFieldsStep, makeStep } from './definition'
import { AppTabsBlock, TABS_ID, type Tab } from './model'
import { postQuery, postsQuery, statsQuery } from './query'

export const PostsBinding = ApplicationDefinition.makeBinding(postsQuery, {
  field: 'posts',
})

export const StatsBinding = ApplicationDefinition.makeBinding(statsQuery, {
  field: 'stats',
})

export const PostDetailsBinding = ApplicationDefinition.makeBinding(postQuery, {
  field: 'postDetails',
})

const activateTabStep = (tab: Tab) => {
  const selectTabStep = makeFieldsStep(() => ({
    activeTab: () => tab,
  }))

  const loadTabStep = Match.value(tab).pipe(
    Match.when('Posts', () => PostsBinding.requestLoadIfMissing()),
    Match.when('Stats', () => StatsBinding.requestLoadIfMissing()),
    Match.exhaustive,
  )

  return makeStep(() => Update.combineSteps([selectTabStep, loadTabStep]))
}

export const TabsBinding = ApplicationDefinition.makeBinding(AppTabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: TABS_ID }] },
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(AppTabsBlock, {
    Selected: ({ value }) => activateTabStep(value),
  }),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [TabsBinding, PostsBinding, StatsBinding, PostDetailsBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
