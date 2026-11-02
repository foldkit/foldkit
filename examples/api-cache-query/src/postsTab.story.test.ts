import { Option, Result } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  type PostsTabFixtureModel,
  failedFirstPostTabModel,
  failedPostsTabModel,
  firstPostDetail,
  fixturePosts,
  loadedPostsTabModel,
} from './application.fixture'
import { PostQuery, PostsQuery, PostsTab, PostsTabLive } from './postsTab'

const FIRST_REQUEST_GENERATION = 1
const SECOND_REQUEST_GENERATION = 2

const postAsyncDataTag = (
  model: PostsTabFixtureModel,
  postId: string,
): string => PostQuery.read(model.postDetails, { postId })._tag

describe('update', () => {
  it.effect('refreshing posts refetches while keeping the current list', () =>
    story(
      PostsTabLive,
      given(loadedPostsTabModel),
      message(PostsTab.Message.ClickedRefreshPosts()),
      model(model => {
        const postsAsyncData = PostsQuery.read(model.posts)
        expect(postsAsyncData._tag).toBe('Refreshing')
        if (postsAsyncData._tag === 'Refreshing') {
          expect(postsAsyncData.data.posts).toEqual(fixturePosts)
        }
      }),
      Command.resolve(
        PostsQuery.Fetch,
        PostsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT + 1000,
          }),
        }),
      ),
      model(model => {
        expect(PostsQuery.read(model.posts)._tag).toBe('Success')
      }),
    ),
  )

  it.effect('retrying failed posts shows the loading state and refetches', () =>
    story(
      PostsTabLive,
      given(failedPostsTabModel),
      message(PostsTab.Message.ClickedRetryPosts()),
      model(model => {
        expect(PostsQuery.read(model.posts)._tag).toBe('Loading')
      }),
      Command.resolve(
        PostsQuery.Fetch,
        PostsQuery.Message.CompletedFetch({
          generation: SECOND_REQUEST_GENERATION,
          result: Result.succeed({
            posts: fixturePosts,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      model(model => {
        expect(PostsQuery.read(model.posts)._tag).toBe('Success')
      }),
    ),
  )

  it.effect(
    'opening a post once reuses its retained data on later visits',
    () =>
      story(
        PostsTabLive,
        given(loadedPostsTabModel),
        message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
        model(model => {
          expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
        }),
        Command.resolve(
          PostQuery.Fetch,
          PostQuery.Message.CompletedFetch({
            args: { postId: 'first-post' },
            generation: FIRST_REQUEST_GENERATION,
            requestKey: FIRST_POST_REQUEST_KEY,
            result: Result.succeed({
              post: firstPostDetail,
              fetchedAt: FETCHED_AT,
            }),
          }),
        ),
        message(PostsTab.Message.ClickedBackToPosts()),
        message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
        Command.expectNone(),
        model(model => {
          expect(postAsyncDataTag(model, 'first-post')).toBe('Success')
          expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
        }),
      ),
  )

  it.effect(
    'a failed post fetch enters Failure and retry fetches it again',
    () =>
      story(
        PostsTabLive,
        given(loadedPostsTabModel),
        message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
        Command.resolve(
          PostQuery.Fetch,
          PostQuery.Message.CompletedFetch({
            args: { postId: 'first-post' },
            generation: FIRST_REQUEST_GENERATION,
            requestKey: FIRST_POST_REQUEST_KEY,
            result: Result.fail('The connection dropped.'),
          }),
        ),
        model(model => {
          expect(postAsyncDataTag(model, 'first-post')).toBe('Failure')
        }),
        message(PostsTab.Message.ClickedRetryPost({ postId: 'first-post' })),
        model(model => {
          expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
        }),
        Command.resolve(
          PostQuery.Fetch,
          PostQuery.Message.CompletedFetch({
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

  it.effect('revisiting a post with a cached failure loads it again', () =>
    story(
      PostsTabLive,
      given(failedFirstPostTabModel),
      message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
      model(model => {
        expect(postAsyncDataTag(model, 'first-post')).toBe('Loading')
        expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
      }),
      Command.resolve(
        PostQuery.Fetch,
        PostQuery.Message.CompletedFetch({
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
})
