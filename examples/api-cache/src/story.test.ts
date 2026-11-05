import { HashMap, Option, Result } from 'effect'
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
  fixturePosts,
  fixtureStats,
  it,
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

it.effect(
  'first visit to the Stats tab fetches stats',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'returning to a tab with cached data does not refetch',
  ({ models: { loadedStatsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'a revalidation tick keeps stale stats on screen while refetching',
  ({ models: { loadedStatsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'a failed refresh keeps the stale stats on screen with the error',
  ({ models: { loadedStatsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'refresh clicks during an in-flight fetch are deduplicated',
  ({ models: { loadedStatsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(loadedStatsModel, { stats: () => StatsData.Loading() }),
      ),
      message(Message.ClickedRefreshStats()),
      Command.expectNone(),
    ),
)

it.effect(
  'a revalidation tick during a refresh is deduplicated',
  ({ models: { loadedStatsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'invalidating posts refetches while keeping the current list',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'retrying failed posts shows the loading state and refetches',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'opening a post fetches it once and serves revisits from the Model',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'a failed post detail fetch lands in Failure and retry refetches',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)

it.effect(
  'revisiting a post with a cached failure shows it without refetching',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
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
    ),
)
