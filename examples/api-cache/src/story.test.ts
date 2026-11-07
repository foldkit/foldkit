import { Effect, HashMap, Option, Result } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { FetchPostDetail, FetchPosts, FetchStats } from './command'
import { TabsBinding } from './composition'
import { ApplicationBlock, layer } from './index'
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
  fixtureEffects,
  fixturePosts,
  fixtureStats,
} from './model.fixture'

const postDetailTag = (model: Model, postId: string): string =>
  HashMap.get(model.postDetailById, postId).pipe(
    Option.map(postDetail => postDetail._tag),
    Option.getOrElse(() => 'Missing'),
  )

const selectedPostsTab = Story.messageIn(
  TabsBinding,
  ApplicationTabsBlock.Message.SelectedTab({ index: 0, value: 'Posts' }),
)

const selectedStatsTab = Story.messageIn(
  TabsBinding,
  ApplicationTabsBlock.Message.SelectedTab({ index: 1, value: 'Stats' }),
)

const resolveFocusTab = Story.Command.resolve(
  Tabs.test.FocusTab,
  ApplicationTabsBlock.Message.CompletedFocusTab(),
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
        expect(model.stats._tag).toBe('Loading')
      }),
      resolveFocusTab,
      Story.Command.resolve(
        FetchStats,
        Message.CompletedFetchStats({
          result: Result.succeed({
            stats: fixtureStats,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      Story.model(model => {
        expect(model.stats._tag).toBe('Success')
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
        expect(model.stats._tag).toBe('Success')
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
        Story.message(Message.TickedRevalidateStats()),
        Story.model(model => {
          expect(model.stats._tag).toBe('Refreshing')
          if (model.stats._tag === 'Refreshing') {
            expect(model.stats.data.stats).toEqual(fixtureStats)
          }
        }),
        Story.Command.resolve(
          FetchStats,
          Message.CompletedFetchStats({
            result: Result.succeed({
              stats: modifyFields(fixtureStats, { activeUsers: () => 99 }),
              fetchedAt: FETCHED_AT + 5000,
            }),
          }),
        ),
        Story.model(model => {
          expect(model.stats._tag).toBe('Success')
          if (model.stats._tag === 'Success') {
            expect(model.stats.data.stats.activeUsers).toBe(99)
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
        Story.message(Message.TickedRevalidateStats()),
        Story.Command.resolve(
          FetchStats,
          Message.CompletedFetchStats({
            result: Result.fail('The server is down.'),
          }),
        ),
        Story.model(model => {
          expect(model.stats._tag).toBe('Stale')
          if (model.stats._tag === 'Stale') {
            expect(model.stats.data.stats).toEqual(fixtureStats)
            expect(model.stats.error).toBe('The server is down.')
          }
        }),
      )
    }),
)

it.effect('refresh clicks during an in-flight fetch are deduplicated', () =>
  Effect.gen(function* () {
    const loadedStatsModel = yield* fixtureEffects.loadedStatsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(loadedStatsModel, { stats: () => StatsData.Loading() }),
      ),
      Story.message(Message.ClickedRefreshStats()),
      Story.Command.expectNone(),
    )
  }),
)

it.effect('a revalidation tick during a refresh is deduplicated', () =>
  Effect.gen(function* () {
    const loadedStatsModel = yield* fixtureEffects.loadedStatsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(loadedStatsModel, {
          stats: () =>
            StatsData.Refreshing({
              data: { stats: fixtureStats, fetchedAt: FETCHED_AT },
            }),
        }),
      ),
      Story.message(Message.TickedRevalidateStats()),
      Story.Command.expectNone(),
    )
  }),
)

it.effect('invalidating posts refetches while keeping the current list', () =>
  Effect.gen(function* () {
    const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadedPostsModel),
      Story.message(Message.ClickedInvalidatePosts()),
      Story.model(model => {
        expect(model.posts._tag).toBe('Refreshing')
        if (model.posts._tag === 'Refreshing') {
          expect(model.posts.data.posts).toEqual(fixturePosts)
        }
      }),
      Story.Command.resolve(
        FetchPosts,
        Message.CompletedFetchPosts({
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT + 1000,
          }),
        }),
      ),
      Story.model(model => {
        expect(model.posts._tag).toBe('Success')
      }),
    )
  }),
)

it.effect('retrying failed posts shows the loading state and refetches', () =>
  Effect.gen(function* () {
    const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

    return yield* Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(loadedPostsModel, {
          posts: () => PostsData.Failure({ error: 'The server is down.' }),
        }),
      ),
      Story.message(Message.ClickedRetryPosts()),
      Story.model(model => {
        expect(model.posts._tag).toBe('Loading')
      }),
      Story.Command.resolve(
        FetchPosts,
        Message.CompletedFetchPosts({
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      Story.model(model => {
        expect(model.posts._tag).toBe('Success')
      }),
    )
  }),
)

it.effect(
  'opening a post fetches it once and serves revisits from the Model',
  () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Story.story(
        { block: ApplicationBlock, layer },
        Story.given(loadedPostsModel),
        Story.message(Message.ClickedPost({ postId: 'first-post' })),
        Story.model(model => {
          expect(postDetailTag(model, 'first-post')).toBe('Loading')
        }),
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
        Story.message(Message.ClickedPost({ postId: 'first-post' })),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(postDetailTag(model, 'first-post')).toBe('Success')
          expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
        }),
      )
    }),
)

it.effect(
  'a failed post detail fetch lands in Failure and retry refetches',
  () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Story.story(
        { block: ApplicationBlock, layer },
        Story.given(loadedPostsModel),
        Story.message(Message.ClickedPost({ postId: 'first-post' })),
        Story.Command.resolve(
          FetchPostDetail,
          Message.CompletedFetchPostDetail({
            postId: 'first-post',
            result: Result.fail('The connection dropped.'),
          }),
        ),
        Story.model(model => {
          expect(postDetailTag(model, 'first-post')).toBe('Failure')
        }),
        Story.message(Message.ClickedRetryPostDetail({ postId: 'first-post' })),
        Story.model(model => {
          expect(postDetailTag(model, 'first-post')).toBe('Loading')
        }),
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
        Story.model(model => {
          expect(postDetailTag(model, 'first-post')).toBe('Success')
        }),
      )
    }),
)

it.effect(
  'revisiting a post with a cached failure shows it without refetching',
  () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(loadedPostsModel, {
            postDetailById: () =>
              HashMap.set(
                HashMap.empty(),
                'first-post',
                PostDetailData.Failure({ error: 'The connection dropped.' }),
              ),
          }),
        ),
        Story.message(Message.ClickedPost({ postId: 'first-post' })),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(postDetailTag(model, 'first-post')).toBe('Failure')
          expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
        }),
      )
    }),
)
