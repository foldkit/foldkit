import { Option, Result } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import { Message, postQuery, postsQuery, statsQuery, update } from './main'
import {
  FETCHED_AT,
  failedFirstPostModel,
  failedPostsModel,
  firstPostDetail,
  fixturePosts,
  fixtureStats,
  loadedPostsModel,
  loadedStatsModel,
  loadingStatsModel,
  refreshingStatsModel,
} from './main.fixture'

const postDataTag = (model: typeof loadedPostsModel, postId: string): string =>
  postQuery.read(model.postDetails, { postId })._tag

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
      expect(statsQuery.read(model.stats)._tag).toBe('Loading')
    }),
    resolveFocusTab,
    Command.resolve(
      statsQuery.Fetch,
      statsQuery.Message.CompletedFetch({
        result: Result.succeed({
          stats: fixtureStats,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    model(model => {
      expect(statsQuery.read(model.stats)._tag).toBe('Success')
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
      expect(statsQuery.read(model.stats)._tag).toBe('Success')
    }),
  )
})

test('a revalidation tick keeps stale stats on screen while refetching', () => {
  story(
    update,
    given(loadedStatsModel),
    message(Message.TickedStatsRefreshInterval()),
    model(model => {
      const statsData = statsQuery.read(model.stats)
      expect(statsData._tag).toBe('Refreshing')
      if (statsData._tag === 'Refreshing') {
        expect(statsData.data.stats).toEqual(fixtureStats)
      }
    }),
    Command.resolve(
      statsQuery.Fetch,
      statsQuery.Message.CompletedFetch({
        result: Result.succeed({
          stats: modifyFields(fixtureStats, { activeUsers: () => 99 }),
          fetchedAt: FETCHED_AT + 5000,
        }),
      }),
    ),
    model(model => {
      const statsData = statsQuery.read(model.stats)
      expect(statsData._tag).toBe('Success')
      if (statsData._tag === 'Success') {
        expect(statsData.data.stats.activeUsers).toBe(99)
      }
    }),
  )
})

test('a failed refresh keeps the stale stats on screen with the error', () => {
  story(
    update,
    given(loadedStatsModel),
    message(Message.TickedStatsRefreshInterval()),
    Command.resolve(
      statsQuery.Fetch,
      statsQuery.Message.CompletedFetch({
        result: Result.fail('The server is down.'),
      }),
    ),
    model(model => {
      const statsData = statsQuery.read(model.stats)
      expect(statsData._tag).toBe('Stale')
      if (statsData._tag === 'Stale') {
        expect(statsData.data.stats).toEqual(fixtureStats)
        expect(statsData.error).toBe('The server is down.')
      }
    }),
  )
})

test('refresh clicks during an in-flight fetch are deduplicated', () => {
  story(
    update,
    given(loadingStatsModel),
    message(Message.ClickedRefreshStats()),
    Command.expectNone(),
  )
})

test('a revalidation tick during a refresh is deduplicated', () => {
  story(
    update,
    given(refreshingStatsModel),
    message(Message.TickedStatsRefreshInterval()),
    Command.expectNone(),
  )
})

test('refreshing posts refetches while keeping the current list', () => {
  story(
    update,
    given(loadedPostsModel),
    message(Message.ClickedRefreshPosts()),
    model(model => {
      const postsData = postsQuery.read(model.posts)
      expect(postsData._tag).toBe('Refreshing')
      if (postsData._tag === 'Refreshing') {
        expect(postsData.data.posts).toEqual(fixturePosts)
      }
    }),
    Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        result: Result.succeed({
          posts: fixturePosts,
          fetchedAt: FETCHED_AT + 1000,
        }),
      }),
    ),
    model(model => {
      expect(postsQuery.read(model.posts)._tag).toBe('Success')
    }),
  )
})

test('retrying failed posts shows the loading state and refetches', () => {
  story(
    update,
    given(failedPostsModel),
    message(Message.ClickedRetryPosts()),
    model(model => {
      expect(postsQuery.read(model.posts)._tag).toBe('Loading')
    }),
    Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        result: Result.succeed({
          posts: fixturePosts,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    model(model => {
      expect(postsQuery.read(model.posts)._tag).toBe('Success')
    }),
  )
})

test('opening a post once reuses its retained data on later visits', () => {
  story(
    update,
    given(loadedPostsModel),
    message(Message.ClickedPost({ postId: 'first-post' })),
    model(model => {
      expect(postDataTag(model, 'first-post')).toBe('Loading')
    }),
    Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: { postId: 'first-post' },
        result: Result.succeed({
          post: firstPostDetail,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    message(Message.ClickedBackToPosts()),
    message(Message.ClickedPost({ postId: 'first-post' })),
    Command.expectNone(),
    model(model => {
      expect(postDataTag(model, 'first-post')).toBe('Success')
      expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
    }),
  )
})

test('a failed post fetch enters Failure and retry fetches it again', () => {
  story(
    update,
    given(loadedPostsModel),
    message(Message.ClickedPost({ postId: 'first-post' })),
    Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: { postId: 'first-post' },
        result: Result.fail('The connection dropped.'),
      }),
    ),
    model(model => {
      expect(postDataTag(model, 'first-post')).toBe('Failure')
    }),
    message(Message.ClickedRetryPost({ postId: 'first-post' })),
    model(model => {
      expect(postDataTag(model, 'first-post')).toBe('Loading')
    }),
    Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: { postId: 'first-post' },
        result: Result.succeed({
          post: firstPostDetail,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    model(model => {
      expect(postDataTag(model, 'first-post')).toBe('Success')
    }),
  )
})

test('revisiting a post with a cached failure loads it again', () => {
  story(
    update,
    given(failedFirstPostModel),
    message(Message.ClickedPost({ postId: 'first-post' })),
    model(model => {
      expect(postDataTag(model, 'first-post')).toBe('Loading')
      expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
    }),
    Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: { postId: 'first-post' },
        result: Result.fail('The connection dropped.'),
      }),
    ),
    model(model => {
      expect(postDataTag(model, 'first-post')).toBe('Failure')
    }),
  )
})
