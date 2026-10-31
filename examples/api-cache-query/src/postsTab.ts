import { Array, Clock, Effect, Layer, Option, Schema } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { Query } from 'foldkit/experimental'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Button from '@foldkit/ui/button'

import { Post, PostDetail, fetchPostDetail, fetchPosts } from './domain/data'
import {
  errorPanel,
  formatFetchedAt,
  loadingPanel,
  toolbarButtonClassName,
} from './domain/panel'

const PostsData = Schema.Struct({
  posts: Schema.Array(Post),
  fetchedAt: Schema.Number,
})
type PostsData = typeof PostsData.Type

const PostData = Schema.Struct({
  post: PostDetail,
  fetchedAt: Schema.Number,
})
type PostData = typeof PostData.Type

export const PostsQuery = Query.define({
  name: 'Posts',
  data: PostsData,
  error: Schema.String,
  handler: function* () {
    const clock = yield* Clock.Clock

    return () =>
      Effect.gen(function* () {
        const posts = yield* fetchPosts
        const fetchedAt = yield* clock.currentTimeMillis

        return { posts, fetchedAt }
      })
  },
})

export const PostQuery = Query.define({
  name: 'Post',
  args: { postId: Schema.String },
  data: PostData,
  error: Schema.String,
  handler: function* () {
    const clock = yield* Clock.Clock

    return ({ postId }) =>
      Effect.gen(function* () {
        const post = yield* fetchPostDetail(postId)
        const fetchedAt = yield* clock.currentTimeMillis

        return { post, fetchedAt }
      })
  },
})

const Model = Schema.Struct({
  posts: PostsQuery,
  postDetails: PostQuery,
  maybeSelectedPostId: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedLoadIfMissing: {},
  ClickedPost: { postId: Schema.String },
  ClickedBackToPosts: {},
  ClickedRefreshPosts: {},
  ClickedRetryPosts: {},
  ClickedRetryPost: { postId: Schema.String },
})
type Message = typeof Message.Type

export class PostsTab extends Block<PostsTab>()('PostsTab', {
  Model,
  Message,
}) {}

export const PostsTabLive = PostsTab.make(
  Effect.fn(function* () {
    const posts = yield* new PostsQuery('posts', { isLoadingOnStart: true })
    const postDetails = yield* new PostQuery('postDetails', {})

    return {
      model: {
        posts,
        postDetails,
        maybeSelectedPostId: Option.none(),
      },

      update: {
        RequestedLoadIfMissing: model => ({
          model,
          messages: [
            model.posts.send(PostsQuery.Message.RequestedLoadIfMissing()),
          ],
        }),
        ClickedPost: (model, { postId }) => ({
          model: modifyFields(model, {
            maybeSelectedPostId: () => Option.some(postId),
          }),
          messages: [
            model.postDetails.send(
              PostQuery.Message.RequestedLoadIfMissing({ args: { postId } }),
            ),
          ],
        }),
        ClickedBackToPosts: model => ({
          model: modifyFields(model, {
            maybeSelectedPostId: () => Option.none(),
          }),
        }),
        ClickedRefreshPosts: model => ({
          model,
          messages: [
            model.posts.send(PostsQuery.Message.RequestedRevalidationOrLoad()),
          ],
        }),
        ClickedRetryPosts: model => ({
          model,
          messages: [
            model.posts.send(PostsQuery.Message.RequestedRevalidationOrLoad()),
          ],
        }),
        ClickedRetryPost: (model, { postId }) => ({
          model,
          messages: [
            model.postDetails.send(
              PostQuery.Message.RequestedRevalidationOrLoad({
                args: { postId },
              }),
            ),
          ],
        }),
      },

      view: (model, h) =>
        Option.match(model.maybeSelectedPostId, {
          onNone: () =>
            h.section(
              [h.Class('flex flex-col gap-4')],
              [postsListView(model, h)],
            ),
          onSome: postId =>
            h.keyed('section')(
              postId,
              [h.Class('flex flex-col gap-4')],
              [postDetailView({ model, postId }, h)],
            ),
        }),
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(PostsQuery.Live, PostQuery.Live)))

type PostsTabViewBuilder = HtmlBuilder<Message>

const isPostCached = (
  postDetails: Model['postDetails'],
  postId: string,
): boolean => AsyncData.hasData(PostQuery.read(postDetails.model, { postId }))

const postsListView = (model: Model, h: PostsTabViewBuilder) => {
  const postsAsyncData = PostsQuery.read(model.posts.model)
  const isPending = AsyncData.isPending(postsAsyncData)

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Posts']),
          Button.view(
            {
              onClick: Message.ClickedRefreshPosts(),
              isDisabled: isPending,
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(toolbarButtonClassName)],
                  [
                    AsyncData.isRefreshing(postsAsyncData)
                      ? 'Refreshing…'
                      : 'Refresh',
                  ],
                ),
            },
            h,
          ),
        ],
      ),
      h.p(
        [h.Class('text-sm text-slate-500')],
        [
          'Open a post, then go back. The detail stays in the Query. Opening it again reads that entry and does not fetch.',
        ],
      ),
      AsyncData.matchData(postsAsyncData, {
        onEmpty: () => loadingPanel('Loading posts…', h),
        onFailure: error =>
          errorPanel({ error, retryMessage: Message.ClickedRetryPosts() }, h),
        onData: ({ posts }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postsAsyncData), {
                onNone: () => [],
                onSome: error => [
                  errorPanel(
                    { error, retryMessage: Message.ClickedRetryPosts() },
                    h,
                  ),
                ],
              }),
              h.ul(
                [h.Class('flex flex-col gap-2')],
                postListItems({ posts, postDetails: model.postDetails }, h),
              ),
            ],
          ),
      }),
    ],
  )
}

const postListItems = (
  {
    posts,
    postDetails,
  }: Readonly<{
    posts: ReadonlyArray<Post>
    postDetails: Model['postDetails']
  }>,
  h: PostsTabViewBuilder,
) =>
  Array.map(posts, post =>
    h.keyed('li')(
      post.id,
      [],
      [
        Button.view(
          {
            onClick: Message.ClickedPost({ postId: post.id }),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    'w-full text-left bg-white rounded-lg shadow px-4 py-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-4',
                  ),
                ],
                [
                  h.div(
                    [],
                    [
                      h.div(
                        [h.Class('font-semibold text-slate-800')],
                        [post.title],
                      ),
                      h.div(
                        [h.Class('text-sm text-slate-500')],
                        [post.excerpt],
                      ),
                    ],
                  ),
                  isPostCached(postDetails, post.id)
                    ? h.span(
                        [
                          h.Class(
                            'shrink-0 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-1',
                          ),
                        ],
                        ['Cached'],
                      )
                    : h.empty,
                ],
              ),
          },
          h,
        ),
      ],
    ),
  )

const postDetailView = (
  { model, postId }: Readonly<{ model: Model; postId: string }>,
  h: PostsTabViewBuilder,
) => {
  const postAsyncData = PostQuery.read(model.postDetails.model, { postId })

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      Button.view(
        {
          onClick: Message.ClickedBackToPosts(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'self-start text-sm font-semibold text-indigo-600 hover:underline cursor-pointer',
                ),
              ],
              ['Back to posts'],
            ),
        },
        h,
      ),
      AsyncData.matchData(postAsyncData, {
        onEmpty: () => loadingPanel('Loading post…', h),
        onFailure: error =>
          errorPanel(
            { error, retryMessage: Message.ClickedRetryPost({ postId }) },
            h,
          ),
        onData: ({ post, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postAsyncData), {
                onNone: () => [],
                onSome: error => [
                  errorPanel(
                    {
                      error,
                      retryMessage: Message.ClickedRetryPost({ postId }),
                    },
                    h,
                  ),
                ],
              }),
              postCard({ post, fetchedAt }, h),
            ],
          ),
      }),
    ],
  )
}

const postCard = (
  { post, fetchedAt }: Readonly<{ post: PostDetail; fetchedAt: number }>,
  h: PostsTabViewBuilder,
) =>
  h.article(
    [h.Class('bg-white rounded-xl shadow p-6 flex flex-col gap-3')],
    [
      h.h2([h.Class('text-2xl font-bold text-slate-900')], [post.title]),
      h.p([h.Class('text-sm text-slate-500')], [`By ${post.author}`]),
      h.p([h.Class('text-slate-700 leading-relaxed')], [post.body]),
      h.p(
        [h.Class('text-xs text-slate-400')],
        [
          `Fetched at ${formatFetchedAt(fetchedAt)}. Leaving this screen keeps the entry.`,
        ],
      ),
    ],
  )
