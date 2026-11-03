import { Effect, HashMap, Option, Result } from 'effect'
import {
  Command,
  given,
  message,
  messageFrom,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { test as TabsTest } from '@foldkit/ui/tabs'

import { ApplicationBlock } from './block'
import { FetchPostDetail, FetchPosts, FetchStats } from './command'
import { TabsBinding } from './composition'
import { AppLayer } from './layer'
import { Message } from './message'
import {
  ApplicationTabsBlock,
  type Model,
  PostDetailData,
  PostsData,
  StatsData,
} from './model'
import {
  FETCHED_AT,
  firstPostDetail,
  fixturePosts,
  fixtureStats,
  test,
} from './model.fixture'

const postDetailTag = (model: Model, postId: string): string =>
  HashMap.get(model.postDetailById, postId).pipe(
    Option.map(postDetail => postDetail._tag),
    Option.getOrElse(() => 'Missing'),
  )

const selectedPostsTab = messageFrom(
  TabsBinding,
  ApplicationTabsBlock.Message.SelectedTab({ index: 0, value: 'Posts' }),
)

const selectedStatsTab = messageFrom(
  TabsBinding,
  ApplicationTabsBlock.Message.SelectedTab({ index: 1, value: 'Stats' }),
)

const resolveFocusTab = Command.resolve(
  TabsTest.FocusTab,
  ApplicationTabsBlock.Message.CompletedFocusTab(),
)

test('first visit to the Stats tab fetches stats', async ({
  models: { loadedPostsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(loadedPostsModel),
      selectedStatsTab,
      model(model => {
        expect(model.activeTab).toBe('Stats')
        expect(model.stats._tag).toBe('Loading')
      }),
      resolveFocusTab,
      Command.resolve(
        FetchStats,
        Message.CompletedFetchStats({
          result: Result.succeed({
            stats: fixtureStats,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      model(model => {
        expect(model.stats._tag).toBe('Success')
      }),
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('returning to a tab with cached data does not refetch', async ({
  models: { loadedStatsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(loadedStatsModel),
      selectedPostsTab,
      resolveFocusTab,
      Command.expectNone(),
      selectedStatsTab,
      resolveFocusTab,
      Command.expectNone(),
      model(model => {
        expect(model.stats._tag).toBe('Success')
      }),
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('a revalidation tick keeps stale stats on screen while refetching', async ({
  models: { loadedStatsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
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
        Message.CompletedFetchStats({
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
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('a failed refresh keeps the stale stats on screen with the error', async ({
  models: { loadedStatsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(loadedStatsModel),
      message(Message.TickedRevalidateStats()),
      Command.resolve(
        FetchStats,
        Message.CompletedFetchStats({
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
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('refresh clicks during an in-flight fetch are deduplicated', async ({
  models: { loadedStatsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(
        modifyFields(loadedStatsModel, { stats: () => StatsData.Loading() }),
      ),
      message(Message.ClickedRefreshStats()),
      Command.expectNone(),
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('a revalidation tick during a refresh is deduplicated', async ({
  models: { loadedStatsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(
        modifyFields(loadedStatsModel, {
          stats: () =>
            StatsData.Refreshing({
              data: { stats: fixtureStats, fetchedAt: FETCHED_AT },
            }),
        }),
      ),
      message(Message.TickedRevalidateStats()),
      Command.expectNone(),
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('invalidating posts refetches while keeping the current list', async ({
  models: { loadedPostsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
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
        Message.CompletedFetchPosts({
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT + 1000,
          }),
        }),
      ),
      model(model => {
        expect(model.posts._tag).toBe('Success')
      }),
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('retrying failed posts shows the loading state and refetches', async ({
  models: { loadedPostsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(
        modifyFields(loadedPostsModel, {
          posts: () => PostsData.Failure({ error: 'The server is down.' }),
        }),
      ),
      message(Message.ClickedRetryPosts()),
      model(model => {
        expect(model.posts._tag).toBe('Loading')
      }),
      Command.resolve(
        FetchPosts,
        Message.CompletedFetchPosts({
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      model(model => {
        expect(model.posts._tag).toBe('Success')
      }),
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('opening a post fetches it once and serves revisits from the Model', async ({
  models: { loadedPostsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(loadedPostsModel),
      message(Message.ClickedPost({ postId: 'first-post' })),
      model(model => {
        expect(postDetailTag(model, 'first-post')).toBe('Loading')
      }),
      Command.resolve(
        FetchPostDetail,
        Message.CompletedFetchPostDetail({
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
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('a failed post detail fetch lands in Failure and retry refetches', async ({
  models: { loadedPostsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(loadedPostsModel),
      message(Message.ClickedPost({ postId: 'first-post' })),
      Command.resolve(
        FetchPostDetail,
        Message.CompletedFetchPostDetail({
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
        Message.CompletedFetchPostDetail({
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
    ).pipe(Effect.provide(AppLayer)),
  )
})

test('revisiting a post with a cached failure shows it without refetching', async ({
  models: { loadedPostsModel },
}) => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(
        modifyFields(loadedPostsModel, {
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
    ).pipe(Effect.provide(AppLayer)),
  )
})
