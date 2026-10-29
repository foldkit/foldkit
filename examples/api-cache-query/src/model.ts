import { Schema } from 'effect'

import * as Tabs from '@foldkit/ui/tabs'

import { postQuery, postsQuery, statsQuery } from './query'

export const TABS_ID = 'api-cache-query-tabs'

export const Tab = Schema.Literals(['Posts', 'Stats'])
export type Tab = typeof Tab.Type

export const AppTabsBlock = Tabs.makeBlock<Tab>()

export const Model = Schema.Struct({
  tabs: AppTabsBlock.Model,
  activeTab: Tab,
  posts: postsQuery.Model,
  postDetails: postQuery.Model,
  maybeSelectedPostId: Schema.Option(Schema.String),
  stats: statsQuery.Model,
})
export type Model = typeof Model.Type
