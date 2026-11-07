import { Effect, Option, Result } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { TabsBinding } from './composition'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { AppTabsBlock, type Model } from './model'
import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  firstPostDetail,
  fixtureEffects,
  fixturePosts,
  fixtureStats,
} from './model.fixture'
import { postQuery, postsQuery, statsQuery } from './query'

const FIRST_REQUEST_GENERATION = 1
const SECOND_REQUEST_GENERATION = 2

const postAsyncDataTag = (model: Model, postId: string): string =>
  postQuery.read(model.postDetails, { postId })._tag

const selectedPostsTab = Story.messageIn(
  TabsBinding,
  AppTabsBlock.Message.SelectedTab({ index: 0, value: 'Posts' }),
)

const selectedStatsTab = Story.messageIn(
  TabsBinding,
  AppTabsBlock.Message.SelectedTab({ index: 1, value: 'Stats' }),
)

const resolveFocusTab = Story.Command.resolve(
  Tabs.test.FocusTab,
  AppTabsBlock.Message.CompletedFocusTab(),
)

it.effect('first visit to the Stats tab fetches stats', () =>
  Effect.gen(function* () {
    const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedPostsModel),
      selectedStatsTab,
      Story.model(model => {
        expect(model.activeTab).toBe('Stats')
        expect(statsQuery.read(model.stats)._tag).toBe('Loading')
      }),
      resolveFocusTab,
      Story.Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: FIRST_REQUEST_GENERATION,
          result: Result.succeed({
            stats: fixtureStats,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      Story.model(model => {
        expect(statsQuery.read(model.stats)._tag).toBe('Success')
      }),
    )
  }),
)

it.effect('returning to a tab with cached data does not refetch', () =>
  Effect.gen(function* () {
    const loadedStatsModel = yield* fixtureEffects.loadedStatsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedStatsModel),
      selectedPostsTab,
      resolveFocusTab,
      Story.Command.expectNone(),
      selectedStatsTab,
      resolveFocusTab,
      Story.Command.expectNone(),
      Story.model(model => {
        expect(statsQuery.read(model.stats)._tag).toBe('Success')
      }),
    )
  }),
)

it.effect(
  'a revalidation tick keeps stale stats on screen while refetching',
  () =>
    Effect.gen(function* () {
      const loadedStatsModel = yield* fixtureEffects.loadedStatsModel

      return yield* Story.story(
        { block: ApplicationBlock, layer },
        Story.given(loadedStatsModel),
        Story.message(Message.TickedStatsRefreshInterval()),
        Story.model(model => {
          const statsAsyncData = statsQuery.read(model.stats)
          expect(statsAsyncData._tag).toBe('Refreshing')
          if (statsAsyncData._tag === 'Refreshing') {
            expect(statsAsyncData.data.stats).toEqual(fixtureStats)
          }
        }),
        Story.Command.resolve(
          statsQuery.Fetch,
          statsQuery.Message.CompletedFetch({
            generation: SECOND_REQUEST_GENERATION,
            result: Result.succeed({
              stats: modifyFields(fixtureStats, { activeUsers: () => 99 }),
              fetchedAt: FETCHED_AT + 5000,
            }),
          }),
        ),
        Story.model(model => {
          const statsAsyncData = statsQuery.read(model.stats)
          expect(statsAsyncData._tag).toBe('Success')
          if (statsAsyncData._tag === 'Success') {
            expect(statsAsyncData.data.stats.activeUsers).toBe(99)
          }
        }),
      )
    }),
)

it.effect(
  'a failed refresh keeps the stale stats on screen with the error',
  () =>
    Effect.gen(function* () {
      const loadedStatsModel = yield* fixtureEffects.loadedStatsModel

      return yield* Story.story(
        { block: ApplicationBlock, layer },
        Story.given(loadedStatsModel),
        Story.message(Message.TickedStatsRefreshInterval()),
        Story.Command.resolve(
          statsQuery.Fetch,
          statsQuery.Message.CompletedFetch({
            generation: SECOND_REQUEST_GENERATION,
            result: Result.fail('The server is down.'),
          }),
        ),
        Story.model(model => {
          const statsAsyncData = statsQuery.read(model.stats)
          expect(statsAsyncData._tag).toBe('Stale')
          if (statsAsyncData._tag === 'Stale') {
            expect(statsAsyncData.data.stats).toEqual(fixtureStats)
            expect(statsAsyncData.error).toBe('The server is down.')
          }
        }),
      )
    }),
)

it.effect('refresh clicks during an in-flight fetch are deduplicated', () =>
  Effect.gen(function* () {
    const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedPostsModel),
      Story.message(Message.ClickedRefreshStats()),
      Story.message(Message.ClickedRefreshStats()),
      Story.Command.expectExact(statsQuery.Fetch),
      Story.Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: FIRST_REQUEST_GENERATION,
          result: Result.fail('The server is down.'),
        }),
      ),
    )
  }),
)

it.effect('a revalidation tick during a refresh is deduplicated', () =>
  Effect.gen(function* () {
    const loadedStatsModel = yield* fixtureEffects.loadedStatsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedStatsModel),
      Story.message(Message.TickedStatsRefreshInterval()),
      Story.message(Message.TickedStatsRefreshInterval()),
      Story.Command.expectExact(statsQuery.Fetch),
      Story.Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.fail('The server is down.'),
        }),
      ),
    )
  }),
)

it.effect('refreshing posts refetches while keeping the current list', () =>
  Effect.gen(function* () {
    const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedPostsModel),
      Story.message(Message.ClickedRefreshPosts()),
      Story.model(model => {
        const postsAsyncData = postsQuery.read(model.posts)
        expect(postsAsyncData._tag).toBe('Refreshing')
        if (postsAsyncData._tag === 'Refreshing') {
          expect(postsAsyncData.data.posts).toEqual(fixturePosts)
        }
      }),
      Story.Command.resolve(
        postsQuery.Fetch,
        postsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT + 1000,
          }),
        }),
      ),
      Story.model(model => {
        expect(postsQuery.read(model.posts)._tag).toBe('Success')
      }),
    )
  }),
)

it.effect('retrying failed posts shows the loading state and refetches', () =>
  Effect.gen(function* () {
    const failedPostsModel = yield* fixtureEffects.failedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(failedPostsModel),
      Story.message(Message.ClickedRetryPosts()),
      Story.model(model => {
        expect(postsQuery.read(model.posts)._tag).toBe('Loading')
      }),
      Story.Command.resolve(
        postsQuery.Fetch,
        postsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      Story.model(model => {
        expect(postsQuery.read(model.posts)._tag).toBe('Success')
      }),
    )
  }),
)

it.effect('opening a post once reuses its retained data on later visits', () =>
  Effect.gen(function* () {
    const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedPostsModel),
      Story.message(Message.ClickedPost({ postId: 'first-post' })),
      Story.model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
      }),
      Story.Command.resolve(
        postQuery.Fetch,
        postQuery.Message.CompletedFetch({
          args: { postId: 'first-post' },
          generation: FIRST_REQUEST_GENERATION,
          requestKey: FIRST_POST_REQUEST_KEY,
          result: Result.succeed({
            post: firstPostDetail,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      Story.message(Message.ClickedBackToPosts()),
      Story.message(Message.ClickedPost({ postId: 'first-post' })),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Success')
        expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
      }),
    )
  }),
)

it.effect('a failed post fetch enters Failure and retry fetches it again', () =>
  Effect.gen(function* () {
    const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedPostsModel),
      Story.message(Message.ClickedPost({ postId: 'first-post' })),
      Story.Command.resolve(
        postQuery.Fetch,
        postQuery.Message.CompletedFetch({
          args: { postId: 'first-post' },
          generation: FIRST_REQUEST_GENERATION,
          requestKey: FIRST_POST_REQUEST_KEY,
          result: Result.fail('The connection dropped.'),
        }),
      ),
      Story.model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Failure')
      }),
      Story.message(Message.ClickedRetryPost({ postId: 'first-post' })),
      Story.model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
      }),
      Story.Command.resolve(
        postQuery.Fetch,
        postQuery.Message.CompletedFetch({
          args: { postId: 'first-post' },
          generation: SECOND_REQUEST_GENERATION,
          requestKey: FIRST_POST_REQUEST_KEY,
          result: Result.succeed({
            post: firstPostDetail,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      Story.model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Success')
      }),
    )
  }),
)

it.effect('revisiting a post with a cached failure loads it again', () =>
  Effect.gen(function* () {
    const failedFirstPostModel = yield* fixtureEffects.failedFirstPostModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(failedFirstPostModel),
      Story.message(Message.ClickedPost({ postId: 'first-post' })),
      Story.model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
        expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
      }),
      Story.Command.resolve(
        postQuery.Fetch,
        postQuery.Message.CompletedFetch({
          args: { postId: 'first-post' },
          generation: SECOND_REQUEST_GENERATION,
          requestKey: FIRST_POST_REQUEST_KEY,
          result: Result.fail('The connection dropped.'),
        }),
      ),
      Story.model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Failure')
      }),
    )
  }),
)
