import { Tabs } from '@foldkit/ui'
import { HashMap, Option } from 'effect'
import { Story } from 'foldkit'
import { expect, test } from 'vitest'

import {
  ClickedBackToPosts,
  ClickedInvalidatePosts,
  ClickedPost,
  ClickedRefreshStats,
  ClickedRetryPostDetail,
  ClickedRetryPosts,
  FailedFetchPostDetail,
  FetchPostDetail,
  FetchPosts,
  FetchStats,
  GotTabsMessage,
  type Model,
  PostDetailData,
  PostsData,
  StatsData,
  SucceededFetchPostDetail,
  SucceededFetchPosts,
  SucceededFetchStats,
  TickedRevalidateStats,
  update,
} from './main'
import {
  FETCHED_AT,
  firstPostDetail,
  fixturePosts,
  fixtureStats,
  loadedPostsModel,
  loadedStatsModel,
} from './main.fixtures'

const postDetailTag = (model: Model, postId: string): string =>
  HashMap.get(model.postDetailById, postId).pipe(
    Option.map(postDetail => postDetail._tag),
    Option.getOrElse(() => 'Missing'),
  )

const selectedPostsTab = GotTabsMessage({
  message: Tabs.SelectedTab({ index: 0, value: 'Posts' }),
})

const selectedStatsTab = GotTabsMessage({
  message: Tabs.SelectedTab({ index: 1, value: 'Stats' }),
})

const resolveFocusTab = Story.Command.resolve(
  Tabs.FocusTab,
  Tabs.CompletedFocusTab(),
  message => GotTabsMessage({ message }),
)

test('first visit to the Stats tab fetches stats', () => {
  Story.story(
    update,
    Story.with(loadedPostsModel),
    Story.message(selectedStatsTab),
    Story.model(model => {
      expect(model.activeTab).toBe('Stats')
      expect(model.stats._tag).toBe('Loading')
    }),
    resolveFocusTab,
    Story.Command.resolve(
      FetchStats,
      SucceededFetchStats({ stats: fixtureStats, fetchedAt: FETCHED_AT }),
    ),
    Story.model(model => {
      expect(model.stats._tag).toBe('Ok')
    }),
  )
})

test('returning to a tab with cached data does not refetch', () => {
  Story.story(
    update,
    Story.with(loadedStatsModel),
    Story.message(selectedPostsTab),
    resolveFocusTab,
    Story.Command.expectNone(),
    Story.message(selectedStatsTab),
    resolveFocusTab,
    Story.Command.expectNone(),
    Story.model(model => {
      expect(model.stats._tag).toBe('Ok')
    }),
  )
})

test('a revalidation tick keeps stale stats on screen while refetching', () => {
  Story.story(
    update,
    Story.with(loadedStatsModel),
    Story.message(TickedRevalidateStats()),
    Story.model(model => {
      expect(model.stats._tag).toBe('Refreshing')
      if (model.stats._tag === 'Refreshing') {
        expect(model.stats.data).toEqual(fixtureStats)
      }
    }),
    Story.Command.resolve(
      FetchStats,
      SucceededFetchStats({
        stats: { ...fixtureStats, activeUsers: 99 },
        fetchedAt: FETCHED_AT + 5000,
      }),
    ),
    Story.model(model => {
      expect(model.stats._tag).toBe('Ok')
      if (model.stats._tag === 'Ok') {
        expect(model.stats.data.activeUsers).toBe(99)
      }
    }),
  )
})

test('refresh clicks during an in-flight fetch are deduplicated', () => {
  Story.story(
    update,
    Story.with({ ...loadedStatsModel, stats: StatsData.Loading() }),
    Story.message(ClickedRefreshStats()),
    Story.Command.expectNone(),
  )
})

test('a revalidation tick during a refresh is deduplicated', () => {
  Story.story(
    update,
    Story.with({
      ...loadedStatsModel,
      stats: StatsData.Refreshing({
        data: fixtureStats,
        fetchedAt: FETCHED_AT,
      }),
    }),
    Story.message(TickedRevalidateStats()),
    Story.Command.expectNone(),
  )
})

test('invalidating posts refetches while keeping the current list', () => {
  Story.story(
    update,
    Story.with(loadedPostsModel),
    Story.message(ClickedInvalidatePosts()),
    Story.model(model => {
      expect(model.posts._tag).toBe('Refreshing')
      if (model.posts._tag === 'Refreshing') {
        expect(model.posts.data).toEqual(fixturePosts)
      }
    }),
    Story.Command.resolve(
      FetchPosts,
      SucceededFetchPosts({
        posts: fixturePosts,
        fetchedAt: FETCHED_AT + 1000,
      }),
    ),
    Story.model(model => {
      expect(model.posts._tag).toBe('Ok')
    }),
  )
})

test('retrying failed posts shows the loading state and refetches', () => {
  Story.story(
    update,
    Story.with({
      ...loadedPostsModel,
      posts: PostsData.Failure({ error: 'The server is down.' }),
    }),
    Story.message(ClickedRetryPosts()),
    Story.model(model => {
      expect(model.posts._tag).toBe('Loading')
    }),
    Story.Command.resolve(
      FetchPosts,
      SucceededFetchPosts({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
    ),
    Story.model(model => {
      expect(model.posts._tag).toBe('Ok')
    }),
  )
})

test('opening a post fetches it once and serves revisits from the Model', () => {
  Story.story(
    update,
    Story.with(loadedPostsModel),
    Story.message(ClickedPost({ postId: 'first-post' })),
    Story.model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Loading')
    }),
    Story.Command.resolve(
      FetchPostDetail,
      SucceededFetchPostDetail({
        postId: 'first-post',
        detail: firstPostDetail,
        fetchedAt: FETCHED_AT,
      }),
    ),
    Story.message(ClickedBackToPosts()),
    Story.message(ClickedPost({ postId: 'first-post' })),
    Story.Command.expectNone(),
    Story.model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Ok')
      expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
    }),
  )
})

test('a failed post detail fetch lands in Failure and retry refetches', () => {
  Story.story(
    update,
    Story.with(loadedPostsModel),
    Story.message(ClickedPost({ postId: 'first-post' })),
    Story.Command.resolve(
      FetchPostDetail,
      FailedFetchPostDetail({
        postId: 'first-post',
        error: 'The connection dropped.',
      }),
    ),
    Story.model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Failure')
    }),
    Story.message(ClickedRetryPostDetail({ postId: 'first-post' })),
    Story.model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Loading')
    }),
    Story.Command.resolve(
      FetchPostDetail,
      SucceededFetchPostDetail({
        postId: 'first-post',
        detail: firstPostDetail,
        fetchedAt: FETCHED_AT,
      }),
    ),
    Story.model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Ok')
    }),
  )
})

test('revisiting a post with a cached failure shows it without refetching', () => {
  Story.story(
    update,
    Story.with({
      ...loadedPostsModel,
      postDetailById: HashMap.set(
        HashMap.empty(),
        'first-post',
        PostDetailData.Failure({ error: 'The connection dropped.' }),
      ),
    }),
    Story.message(ClickedPost({ postId: 'first-post' })),
    Story.Command.expectNone(),
    Story.model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Failure')
      expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
    }),
  )
})
