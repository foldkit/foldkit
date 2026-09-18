import { HashMap, Option, Result, Schema } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import {
  FetchPostDetail,
  FetchPosts,
  FetchStats,
  Message,
  postDetailQuery,
  postsQuery,
  statsQuery,
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

const encodeKey = Schema.Unknown.pipe(
  Schema.toCodecJson,
  Schema.fromJsonString,
  Schema.encodeUnknownSync,
)

const postDetailTag = (
  model: typeof loadedPostsModel,
  postId: string,
): string => postDetailQuery.read(model.postDetailById, { postId })._tag

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
      statsQuery.Message.SettledFetch({
        result: Result.succeed({
          stats: fixtureStats,
          fetchedAt: FETCHED_AT,
        }),
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
      statsQuery.Message.SettledFetch({
        result: Result.succeed({
          stats: modifyFields(fixtureStats, { activeUsers: () => 99 }),
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
      statsQuery.Message.SettledFetch({
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
    given(modifyFields(loadedStatsModel, { stats: () => AsyncData.Loading() })),
    message(Message.ClickedRefreshStats()),
    Command.expectNone(),
  )
})

test('a revalidation tick during a refresh is deduplicated', () => {
  story(
    update,
    given(
      modifyFields(loadedStatsModel, {
        stats: () =>
          AsyncData.Refreshing({
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
      postsQuery.Message.SettledFetch({
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
      modifyFields(loadedPostsModel, {
        posts: () => AsyncData.Failure({ error: 'The server is down.' }),
      }),
    ),
    message(Message.ClickedRetryPosts()),
    model(model => {
      expect(model.posts._tag).toBe('Loading')
    }),
    Command.resolve(
      FetchPosts,
      postsQuery.Message.SettledFetch({
        result: Result.succeed({
          posts: fixturePosts,
          fetchedAt: FETCHED_AT,
        }),
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
      postDetailQuery.Message.SettledFetch({
        args: { postId: 'first-post' },
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
      postDetailQuery.Message.SettledFetch({
        args: { postId: 'first-post' },
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
      postDetailQuery.Message.SettledFetch({
        args: { postId: 'first-post' },
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

test('revisiting a post with a cached failure loads it again', () => {
  story(
    update,
    given(
      modifyFields(loadedPostsModel, {
        postDetailById: () =>
          HashMap.set(
            postDetailQuery.init(),
            encodeKey({ postId: 'first-post' }),
            {
              args: { postId: 'first-post' },
              data: AsyncData.Failure({ error: 'The connection dropped.' }),
            },
          ),
      }),
    ),
    message(Message.ClickedPost({ postId: 'first-post' })),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Loading')
      expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
    }),
    Command.resolve(
      FetchPostDetail,
      postDetailQuery.Message.SettledFetch({
        args: { postId: 'first-post' },
        result: Result.fail('The connection dropped.'),
      }),
    ),
    model(model => {
      expect(postDetailTag(model, 'first-post')).toBe('Failure')
    }),
  )
})
