import { Effect, HashMap, Option, Result } from 'effect'
import { Story } from 'foldkit'

import { Tabs } from '@foldkit/ui'

import { FetchPostDetail, FetchPosts, FetchStats } from './command'
import { TabsBinding } from './composition'
import type { Post, PostDetail, Stats } from './data'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import {
  ApplicationTabsBlock,
  type Model,
  PostsData,
  StatsData,
  TABS_ID,
} from './model'

export const FETCHED_AT = 1_750_000_000_000

export const fixturePosts: ReadonlyArray<Post> = [
  {
    id: 'first-post',
    title: 'First Post',
    excerpt: 'The first fixture post.',
  },
  {
    id: 'second-post',
    title: 'Second Post',
    excerpt: 'The second fixture post.',
  },
]

export const firstPostDetail: PostDetail = {
  id: 'first-post',
  title: 'First Post',
  author: 'Grace Hopper',
  body: 'The whole body of the first fixture post.',
}

export const fixtureStats: Stats = {
  activeUsers: 120,
  requestsPerSecond: 1234,
  cacheHitRatePercent: 97,
}

const loadingPostsModel = Story.withBlock(
  { block: ApplicationTabsBlock, layer: Tabs.layer },
  tabs => {
    const model: Model = {
      tabs: tabs.init({ id: TABS_ID }).model,
      activeTab: 'Posts',
      posts: PostsData.Loading(),
      postDetailById: HashMap.empty(),
      maybeSelectedPostId: Option.none(),
      stats: StatsData.Idle(),
    }

    return model
  },
)

const application = { block: ApplicationBlock, layer }

const loadedPostsModel = Story.story(
  application,
  Story.init(),
  Story.Command.resolve(
    FetchPosts,
    Message.CompletedFetchPosts({
      result: Result.succeed({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
    }),
  ),
)

const cachedFirstPostModel = Effect.gen(function* () {
  const loadedPosts = yield* loadedPostsModel

  return yield* Story.story(
    application,
    Story.given(loadedPosts),
    Story.message(Message.ClickedPost({ postId: 'first-post' })),
    Story.Command.resolve(
      FetchPostDetail,
      Message.CompletedFetchPostDetail({
        postId: 'first-post',
        result: Result.succeed({
          detail: firstPostDetail,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    Story.message(Message.ClickedBackToPosts()),
  )
})

const loadedStatsModel = Effect.gen(function* () {
  const loadedPosts = yield* loadedPostsModel

  return yield* Story.story(
    application,
    Story.given(loadedPosts),
    Story.messageIn(
      TabsBinding,
      ApplicationTabsBlock.Message.SelectedTab({ index: 1, value: 'Stats' }),
    ),
    Story.Command.resolve(
      Tabs.test.FocusTab,
      ApplicationTabsBlock.Message.CompletedFocusTab(),
    ),
    Story.Command.resolve(
      FetchStats,
      Message.CompletedFetchStats({
        result: Result.succeed({
          stats: fixtureStats,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
  )
})

export const fixtureEffects = {
  loadingPostsModel,
  loadedPostsModel,
  cachedFirstPostModel,
  loadedStatsModel,
}
