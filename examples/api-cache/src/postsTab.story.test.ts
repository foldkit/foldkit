import { HashMap, Option, Result } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { expect, it } from '@effect/vitest'

import {
  FETCHED_AT,
  type ResolvedPostsTabModel,
  firstPostDetail,
  fixturePosts,
  loadedPostsTabModel,
} from './application.fixture'
import {
  FetchPostDetail,
  FetchPosts,
  PostDetailData,
  PostsData,
  PostsTab,
  PostsTabLive,
} from './postsTab'

const postDetailTag = (model: ResolvedPostsTabModel, postId: string): string =>
  HashMap.get(model.postDetailById, postId).pipe(
    Option.map(postDetail => postDetail._tag),
    Option.getOrElse(() => 'Missing'),
  )

it.effect('invalidating posts refetches while keeping the current list', () =>
  story(
    PostsTabLive,
    given(loadedPostsTabModel),
    message(PostsTab.Message.ClickedInvalidatePosts()),
    model(model => {
      expect(model.posts._tag).toBe('Refreshing')
      if (model.posts._tag === 'Refreshing') {
        expect(model.posts.data.posts).toEqual(fixturePosts)
      }
    }),
    Command.resolve(
      FetchPosts,
      PostsTab.Message.CompletedFetchPosts({
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

it.effect('retrying failed posts shows the loading state and refetches', () =>
  story(
    PostsTabLive,
    given(
      modifyFields(loadedPostsTabModel, {
        posts: () => PostsData.Failure({ error: 'The server is down.' }),
      }),
    ),
    message(PostsTab.Message.ClickedRetryPosts()),
    model(model => {
      expect(model.posts._tag).toBe('Loading')
    }),
    Command.resolve(
      FetchPosts,
      PostsTab.Message.CompletedFetchPosts({
        result: Result.succeed({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
      }),
    ),
    model(model => {
      expect(model.posts._tag).toBe('Success')
    }),
  ),
)

it.effect(
  'opening a post fetches it once and serves revisits from the Model',
  () =>
    story(
      PostsTabLive,
      given(loadedPostsTabModel),
      message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
      model(model => {
        expect(postDetailTag(model, 'first-post')).toBe('Loading')
      }),
      Command.resolve(
        FetchPostDetail,
        PostsTab.Message.CompletedFetchPostDetail({
          postId: 'first-post',
          result: Result.succeed({
            detail: firstPostDetail,
            fetchedAt: FETCHED_AT,
          }),
        }),
      ),
      message(PostsTab.Message.ClickedBackToPosts()),
      message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
      Command.expectNone(),
      model(model => {
        expect(postDetailTag(model, 'first-post')).toBe('Success')
        expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
      }),
    ),
)

it.effect(
  'a failed post detail fetch lands in Failure and retry refetches',
  () =>
    story(
      PostsTabLive,
      given(loadedPostsTabModel),
      message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
      Command.resolve(
        FetchPostDetail,
        PostsTab.Message.CompletedFetchPostDetail({
          postId: 'first-post',
          result: Result.fail('The connection dropped.'),
        }),
      ),
      model(model => {
        expect(postDetailTag(model, 'first-post')).toBe('Failure')
      }),
      message(
        PostsTab.Message.ClickedRetryPostDetail({ postId: 'first-post' }),
      ),
      model(model => {
        expect(postDetailTag(model, 'first-post')).toBe('Loading')
      }),
      Command.resolve(
        FetchPostDetail,
        PostsTab.Message.CompletedFetchPostDetail({
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
  () =>
    story(
      PostsTabLive,
      given(
        modifyFields(loadedPostsTabModel, {
          postDetailById: () =>
            HashMap.set(
              HashMap.empty(),
              'first-post',
              PostDetailData.Failure({ error: 'The connection dropped.' }),
            ),
        }),
      ),
      message(PostsTab.Message.ClickedPost({ postId: 'first-post' })),
      Command.expectNone(),
      model(model => {
        expect(postDetailTag(model, 'first-post')).toBe('Failure')
        expect(model.maybeSelectedPostId).toEqual(Option.some('first-post'))
      }),
    ),
)
