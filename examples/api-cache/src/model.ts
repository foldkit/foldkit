import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { Tabs } from '@foldkit/ui'

import { Post, PostDetail, Stats } from './data'

export const TABS_ID = 'api-cache-tabs'

export const FetchedPosts = Schema.Struct({
  posts: Schema.Array(Post),
  fetchedAt: Schema.Number,
})

export const FetchedPostDetail = Schema.Struct({
  detail: PostDetail,
  fetchedAt: Schema.Number,
})

export const FetchedStats = Schema.Struct({
  stats: Stats,
  fetchedAt: Schema.Number,
})

export const PostsData = AsyncData.Schema(FetchedPosts, Schema.String)
export const PostDetailData = AsyncData.Schema(FetchedPostDetail, Schema.String)
export const StatsData = AsyncData.Schema(FetchedStats, Schema.String)

export type PostsData = typeof PostsData.schema.Type
export type PostDetailData = typeof PostDetailData.schema.Type
export type StatsData = typeof StatsData.schema.Type

export const Tab = Schema.Literals(['Posts', 'Stats'])
export type Tab = typeof Tab.Type

export const ApplicationTabs = Tabs.create<Tab>()

export const Model = Schema.Struct({
  tabs: ApplicationTabs.Model,
  activeTab: Tab,
  posts: PostsData.schema,
  postDetailById: Schema.HashMap(Schema.String, PostDetailData.schema),
  maybeSelectedPostId: Schema.Option(Schema.String),
  stats: StatsData.schema,
})

export type Model = typeof Model.Type
