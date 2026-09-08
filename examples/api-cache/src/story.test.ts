import { HashMap, Option, Result } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { expect, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import {
  FetchPostDetail,
  FetchPosts,
  FetchStats,
  Message,
  type Model,
  PostDetailData,
  PostsData,
  StatsData,
  update,
} from './main'
import {
  FETCHED_AT,
  firstPostDetail,
  fixturePosts,
  fixtureStats,
  loadedPostsModel,
  loadedStatsModel,
} from './main.fixture'

const postDetailTag = (model: Model, postId: string): string =>
  HashMap.get(model.postDetailById, postId).pipe(
    Option.map(postDetail => postDetail._tag),
    Option.getOrElse(() => 'Missing'),
  )

const selectedPostsTab = Message.GotTabsMessage({
  message: Tabs.Message.SelectedTab({ index: 0, value: 'Posts' }),
})

const selectedStatsTab = Message.GotTabsMessage({
  message: Tabs.Message.SelectedTab({ index: 1, value: 'Stats' }),
})

const resolveFocusTab = Command.resolve(
  Tabs.FocusTab,
  Tabs.Message.CompletedFocusTab(),
)

test('first visit to the Stats tab fetches stats', () => {
  story(
    update,
    given(loadedPostsModel),
    message(selectedStatsTab),
    model(model => {
      expect(model.activeTab).toBe('Stats')
      expect(model.stats._tag).toBe('Loading')
    }),
    resolveFocusTab,
    Command.resolve(
      FetchStats,
      Message.SettledFetchStats({
        result: Result.succeed({ stats: fixtureStats, fetchedAt: FETCHED_AT }),
      }),
    ),
    model(model => {
      expect(model.stats._tag).toBe('Success')
    }),
  )
})

test('returning to a tab with cached data does not refetch', () => {
  story(
    update,
    given(loadedStatsModel),
    message(selectedPostsTab),
    resolveFocusTab,
    Command.expectNone(),
    message(selectedStatsTab),
    resolveFocusTab,
    Command.expectNone(),
    model(model => {
      expect(model.stats._tag).toBe('Success')
    }),
  )
})

test('a revalidation tick keeps stale stats on screen while refetching', () => {
  story(
    update,
    given(loadedStatsModel),
    message(Message.TickedRevalidateStats()),
    model(model => {
      expect(model.stats._tag).toBe('Refreshing')
      if (model.stats._tag === 'Refreshing') {
        expect(model.stats.data.stats).toEqual(fixtureStats)
      }
    }),
    Command.resolve(
      FetchStats,
      Message.SettledFetchStats({
        result: Result.succeed({
          stats: evo(fixtureStats, { activeUsers: () => 99 }),
          fetchedAt: FETCHED_AT + 5000,
        }),
      }),
    ),
    model(model => {
      expect(model.stats._tag).toBe('Success')
      if (model.stats._tag === 'Success') {
        expect(model.stats.data.stats.activeUsers).toBe(99)
      }
    }),
  )
})

test('a failed refresh keeps the stale stats on screen with the error', () => {
  story(
    update,
    given(loadedStatsModel),
    message(Message.TickedRevalidateStats()),
    Command.resolve(
      FetchStats,
      Message.SettledFetchStats({
        result: Result.fail('The server is down.'),
      }),
    ),
    model(model => {
      expect(model.stats._tag).toBe('Stale')
      if (model.stats._tag === 'Stale') {
        expect(model.stats.data.stats).toEqual(fixtureStats)
        expect(model.stats.error).toBe('The server is down.')
      }
    }),
  )
})

test('refresh clicks during an in-flight fetch are deduplicated', () => {
  story(
    update,
    given(evo(loadedStatsModel, { stats: () => StatsData.Loading() })),
    message(Message.ClickedRefreshStats()),
    Command.expectNone(),
  )
})

test('a revalidation tick during a refresh is deduplicated', () => {
  story(
    update,
    given(
      evo(loadedStatsModel, {
        stats: () =>
          StatsData.Refreshing({
            data: { stats: fixtureStats, fetchedAt: FETCHED_AT },
          }),
      }),
    ),
    message(Message.TickedRevalidateStats()),
    Command.expectNone(),
  )
})

test('invalidating posts refetches while keeping the current list', () => {
  story(
    update,
    given(loadedPostsModel),
    message(Message.ClickedInvalidatePosts()),
    model(model => {
      expect(model.posts._tag).toBe('Refreshing')
      if (model.posts._tag === 'Refreshing') {
        expect(model.posts.data.posts).toEqual(fixturePosts)
      }
    }),
    Command.resolve(
      FetchPosts,
      Message.SettledFetchPosts({
        result: Result.succeed({
          posts: fixturePosts,
          fetchedAt: FETCHED_AT + 1000,
        }),
      }),
    ),
    model(model => {
      expect(model.posts._tag).toBe('Success')
    }),
  )
})

test('retrying failed posts shows the loading state and refetches', () => {
  story(
    update,
    given(
      evo(loadedPostsModel, {
        posts: () => PostsData.Failure({ error: 'The server is down.' }),
      }),
    ),
    message(Message.ClickedRetryPosts()),
    model(model => {
      expect(model.posts._tag).toBe('Loading')
    }),
    Command.resolve(
      FetchPosts,
      Message.SettledFetchPosts({
        result: Result.succeed({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
      }),
    ),
    model(model => {
      expect(model.posts._tag).toBe('Success')
    }),
  )
})

test('opening a post fetches it once and serves revisits from the Model', () => {
  story(
    update,
    given(loadedPostsModel),
    message(Message.ClickedPost({ postId: 'first-post' })),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Loading')
    }),
    Command.resolve(
      FetchPostDetail,
      Message.SettledFetchPostDetail({
        postId: 'first-post',
        result: Result.succeed({
          detail: firstPostDetail,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    message(Message.ClickedBackToPosts()),
    message(Message.ClickedPost({ postId: 'first-post' })),
    Command.expectNone(),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Success')
      expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
    }),
  )
})

test('a failed post detail fetch lands in Failure and retry refetches', () => {
  story(
    update,
    given(loadedPostsModel),
    message(Message.ClickedPost({ postId: 'first-post' })),
    Command.resolve(
      FetchPostDetail,
      Message.SettledFetchPostDetail({
        postId: 'first-post',
        result: Result.fail('The connection dropped.'),
      }),
    ),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Failure')
    }),
    message(Message.ClickedRetryPostDetail({ postId: 'first-post' })),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Loading')
    }),
    Command.resolve(
      FetchPostDetail,
      Message.SettledFetchPostDetail({
        postId: 'first-post',
        result: Result.succeed({
          detail: firstPostDetail,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Success')
    }),
  )
})

test('revisiting a post with a cached failure shows it without refetching', () => {
  story(
    update,
    given(
      evo(loadedPostsModel, {
        postDetailById: () =>
          HashMap.set(
            HashMap.empty(),
            'first-post',
            PostDetailData.Failure({ error: 'The connection dropped.' }),
          ),
      }),
    ),
    message(Message.ClickedPost({ postId: 'first-post' })),
    Command.expectNone(),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Failure')
      expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
    }),
  )
})
