import { Option, Result } from 'effect'
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

import { Tabs } from '@foldkit/ui'

import { TabsBinding } from './composition'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { AppTabsBlock, type Model } from './model'
import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  firstPostDetail,
  fixturePosts,
  fixtureStats,
  it,
} from './model.fixture'
import { postQuery, postsQuery, statsQuery } from './query'

const FIRST_REQUEST_GENERATION = 1
const SECOND_REQUEST_GENERATION = 2

const postAsyncDataTag = (model: Model, postId: string): string =>
  postQuery.read(model.postDetails, { postId })._tag

const selectedPostsTab = messageFrom(
  TabsBinding,
  AppTabsBlock.Message.SelectedTab({ index: 0, value: 'Posts' }),
)

const selectedStatsTab = messageFrom(
  TabsBinding,
  AppTabsBlock.Message.SelectedTab({ index: 1, value: 'Stats' }),
)

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  AppTabsBlock.Message.CompletedFocusTab(),
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
        expect(statsQuery.read(model.stats)._tag).toBe('Loading')
      }),
      resolveFocusTab,
      Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: FIRST_REQUEST_GENERATION,
          result: Result.succeed({
            stats: fixtureStats,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      model(model => {
        expect(statsQuery.read(model.stats)._tag).toBe('Success')
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
        expect(statsQuery.read(model.stats)._tag).toBe('Success')
      }),
    ),
)

it.effect(
  'a revalidation tick keeps stale stats on screen while refetching',
  ({ models: { loadedStatsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(loadedStatsModel),
      message(Message.TickedStatsRefreshInterval()),
      model(model => {
        const statsAsyncData = statsQuery.read(model.stats)
        expect(statsAsyncData._tag).toBe('Refreshing')
        if (statsAsyncData._tag === 'Refreshing') {
          expect(statsAsyncData.data.stats).toEqual(fixtureStats)
        }
      }),
      Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.succeed({
            stats: modifyFields(fixtureStats, { activeUsers: () => 99 }),
            fetchedAt: FETCHED_AT + 5000,
          }),
        }),
      ),
      model(model => {
        const statsAsyncData = statsQuery.read(model.stats)
        expect(statsAsyncData._tag).toBe('Success')
        if (statsAsyncData._tag === 'Success') {
          expect(statsAsyncData.data.stats.activeUsers).toBe(99)
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
      message(Message.TickedStatsRefreshInterval()),
      Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.fail('The server is down.'),
        }),
      ),
      model(model => {
        const statsAsyncData = statsQuery.read(model.stats)
        expect(statsAsyncData._tag).toBe('Stale')
        if (statsAsyncData._tag === 'Stale') {
          expect(statsAsyncData.data.stats).toEqual(fixtureStats)
          expect(statsAsyncData.error).toBe('The server is down.')
        }
      }),
    ),
)

it.effect(
  'refresh clicks during an in-flight fetch are deduplicated',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(loadedPostsModel),
      message(Message.ClickedRefreshStats()),
      message(Message.ClickedRefreshStats()),
      Command.expectExact(statsQuery.Fetch),
      Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: FIRST_REQUEST_GENERATION,
          result: Result.fail('The server is down.'),
        }),
      ),
    ),
)

it.effect(
  'a revalidation tick during a refresh is deduplicated',
  ({ models: { loadedStatsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(loadedStatsModel),
      message(Message.TickedStatsRefreshInterval()),
      message(Message.TickedStatsRefreshInterval()),
      Command.expectExact(statsQuery.Fetch),
      Command.resolve(
        statsQuery.Fetch,
        statsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.fail('The server is down.'),
        }),
      ),
    ),
)

it.effect(
  'refreshing posts refetches while keeping the current list',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(loadedPostsModel),
      message(Message.ClickedRefreshPosts()),
      model(model => {
        const postsAsyncData = postsQuery.read(model.posts)
        expect(postsAsyncData._tag).toBe('Refreshing')
        if (postsAsyncData._tag === 'Refreshing') {
          expect(postsAsyncData.data.posts).toEqual(fixturePosts)
        }
      }),
      Command.resolve(
        postsQuery.Fetch,
        postsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT + 1000,
          }),
        }),
      ),
      model(model => {
        expect(postsQuery.read(model.posts)._tag).toBe('Success')
      }),
    ),
)

it.effect(
  'retrying failed posts shows the loading state and refetches',
  ({ models: { failedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(failedPostsModel),
      message(Message.ClickedRetryPosts()),
      model(model => {
        expect(postsQuery.read(model.posts)._tag).toBe('Loading')
      }),
      Command.resolve(
        postsQuery.Fetch,
        postsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      model(model => {
        expect(postsQuery.read(model.posts)._tag).toBe('Success')
      }),
    ),
)

it.effect(
  'opening a post once reuses its retained data on later visits',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(loadedPostsModel),
      message(Message.ClickedPost({ postId: 'first-post' })),
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
      }),
      Command.resolve(
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
      message(Message.ClickedBackToPosts()),
      message(Message.ClickedPost({ postId: 'first-post' })),
      Command.expectNone(),
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Success')
        expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
      }),
    ),
)

it.effect(
  'a failed post fetch enters Failure and retry fetches it again',
  ({ models: { loadedPostsModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(loadedPostsModel),
      message(Message.ClickedPost({ postId: 'first-post' })),
      Command.resolve(
        postQuery.Fetch,
        postQuery.Message.CompletedFetch({
          args: { postId: 'first-post' },
          generation: FIRST_REQUEST_GENERATION,
          requestKey: FIRST_POST_REQUEST_KEY,
          result: Result.fail('The connection dropped.'),
        }),
      ),
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Failure')
      }),
      message(Message.ClickedRetryPost({ postId: 'first-post' })),
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
      }),
      Command.resolve(
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
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Success')
      }),
    ),
)

it.effect(
  'revisiting a post with a cached failure loads it again',
  ({ models: { failedFirstPostModel } }) =>
    story(
      { block: ApplicationBlock, layer },
      given(failedFirstPostModel),
      message(Message.ClickedPost({ postId: 'first-post' })),
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
        expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
      }),
      Command.resolve(
        postQuery.Fetch,
        postQuery.Message.CompletedFetch({
          args: { postId: 'first-post' },
          generation: SECOND_REQUEST_GENERATION,
          requestKey: FIRST_POST_REQUEST_KEY,
          result: Result.fail('The connection dropped.'),
        }),
      ),
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Failure')
      }),
    ),
)
