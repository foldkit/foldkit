import { Array, Clock, Effect, HashMap, Option, Schema, pipe } from 'effect'
import { AsyncData, Block, Command } from 'foldkit'
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

const FetchedPosts = Schema.Struct({
  posts: Schema.Array(Post),
  fetchedAt: Schema.Number,
})

const FetchedPostDetail = Schema.Struct({
  detail: PostDetail,
  fetchedAt: Schema.Number,
})

export const PostsData = AsyncData.Schema(FetchedPosts, Schema.String)
export const PostDetailData = AsyncData.Schema(FetchedPostDetail, Schema.String)

const Model = Schema.Struct({
  posts: PostsData.schema,
  postDetailById: Schema.HashMap(Schema.String, PostDetailData.schema),
  maybeSelectedPostId: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedLoadIfMissing: {},
  ClickedPost: { postId: Schema.String },
  ClickedBackToPosts: {},
  ClickedInvalidatePosts: {},
  ClickedRetryPosts: {},
  ClickedRetryPostDetail: { postId: Schema.String },
  CompletedFetchPosts: { result: Schema.Result(FetchedPosts, Schema.String) },
  CompletedFetchPostDetail: {
    postId: Schema.String,
    result: Schema.Result(FetchedPostDetail, Schema.String),
  },
})
type Message = typeof Message.Type

export const FetchPosts = Command.define('FetchPosts', {
  messages: [Message.CompletedFetchPosts],
})

export const FetchPostDetail = Command.define('FetchPostDetail', {
  args: { postId: Schema.String },
  messages: [Message.CompletedFetchPostDetail],
})

export class PostsTab extends Block<PostsTab>()('PostsTab', {
  Model,
  Message,
  Command: [FetchPosts, FetchPostDetail],
}) {}

type PostsTabViewBuilder = HtmlBuilder<Message>

const applyPostsTransition = (
  model: Model,
  maybeNextPosts: Option.Option<typeof PostsData.schema.Type>,
) =>
  Option.match(maybeNextPosts, {
    onNone: () => ({ model }),
    onSome: nextPosts => ({
      model: modifyFields(model, { posts: () => nextPosts }),
      commands: [FetchPosts()],
    }),
  })

const setPostDetail = (
  postId: string,
  postDetail: typeof PostDetailData.schema.Type,
) => HashMap.set(postId, postDetail)

const isPostDetailCached = (
  postDetailById: HashMap.HashMap<string, typeof PostDetailData.schema.Type>,
  postId: string,
): boolean =>
  Option.exists(HashMap.get(postDetailById, postId), AsyncData.hasData)

const postsListView = (model: Model, h: PostsTabViewBuilder) => {
  const isPending = AsyncData.isPending(model.posts)

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Posts']),
          Button.view(
            {
              onClick: Message.ClickedInvalidatePosts(),
              isDisabled: isPending,
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(toolbarButtonClassName)],
                  [
                    AsyncData.isRefreshing(model.posts)
                      ? 'Refreshing...'
                      : 'Invalidate',
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
          'Open a post, go back, and open it again. The second visit renders instantly from the Model. Invalidate marks the list stale and refetches it while the current list stays on screen.',
        ],
      ),
      AsyncData.matchDataSplitEmpty(model.posts, {
        onIdle: () => loadingPanel('Loading posts...', h),
        onLoading: () => loadingPanel('Loading posts...', h),
        onFailure: error =>
          errorPanel({ error, retryMessage: Message.ClickedRetryPosts() }, h),
        onData: ({ posts }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.posts), {
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
                postListItems(
                  { posts, postDetailById: model.postDetailById },
                  h,
                ),
              ),
            ],
          ),
      }),
    ],
  )
}

type PostListItemsInput = Readonly<{
  posts: ReadonlyArray<Post>
  postDetailById: HashMap.HashMap<string, typeof PostDetailData.schema.Type>
}>

const postListItems = (
  { posts, postDetailById }: PostListItemsInput,
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
                  isPostDetailCached(postDetailById, post.id)
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

type PostDetailInput = Readonly<{ model: Model; postId: string }>

const postDetailSection = (
  { model, postId }: PostDetailInput,
  h: PostsTabViewBuilder,
) =>
  h.keyed('section')(
    postId,
    [h.Class('flex flex-col gap-4')],
    [postDetailView({ model, postId }, h)],
  )

const postDetailView = (
  { model, postId }: PostDetailInput,
  h: PostsTabViewBuilder,
) => {
  const postDetailData = Option.getOrElse(
    HashMap.get(model.postDetailById, postId),
    () => PostDetailData.Idle(),
  )

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
      AsyncData.matchDataSplitEmpty(postDetailData, {
        onIdle: () => loadingPanel('Loading post...', h),
        onLoading: () => loadingPanel('Loading post...', h),
        onFailure: error =>
          errorPanel(
            {
              error,
              retryMessage: Message.ClickedRetryPostDetail({ postId }),
            },
            h,
          ),
        onData: ({ detail, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postDetailData), {
                onNone: () => [],
                onSome: error => [
                  errorPanel(
                    {
                      error,
                      retryMessage: Message.ClickedRetryPostDetail({
                        postId,
                      }),
                    },
                    h,
                  ),
                ],
              }),
              postDetailCard({ detail, fetchedAt }, h),
            ],
          ),
      }),
    ],
  )
}

type PostDetailCardInput = Readonly<{
  detail: PostDetail
  fetchedAt: number
}>

const postDetailCard = (
  { detail, fetchedAt }: PostDetailCardInput,
  h: PostsTabViewBuilder,
) =>
  h.article(
    [h.Class('bg-white rounded-xl shadow p-6 flex flex-col gap-3')],
    [
      h.h2([h.Class('text-2xl font-bold text-slate-900')], [detail.title]),
      h.p([h.Class('text-sm text-slate-500')], [`By ${detail.author}`]),
      h.p([h.Class('text-slate-700 leading-relaxed')], [detail.body]),
      h.p(
        [h.Class('text-xs text-slate-400')],
        [
          `Fetched at ${formatFetchedAt(fetchedAt)}. Future visits render instantly from the Model.`,
        ],
      ),
    ],
  )

export const PostsTabLive = PostsTab.make(
  Effect.fn(function* () {
    const clock = yield* Clock.Clock

    return {
      model: {
        posts: PostsData.Loading(),
        postDetailById: HashMap.empty(),
        maybeSelectedPostId: Option.none(),
      },

      start: [FetchPosts()],

      update: {
        RequestedLoadIfMissing: model =>
          applyPostsTransition(model, AsyncData.loadIfMissing(model.posts)),

        ClickedPost: (model, { postId }) => {
          const selectedModel = modifyFields(model, {
            maybeSelectedPostId: () => Option.some(postId),
          })

          return Option.match(HashMap.get(model.postDetailById, postId), {
            onNone: () => ({
              model: modifyFields(selectedModel, {
                postDetailById: setPostDetail(postId, PostDetailData.Loading()),
              }),
              commands: [FetchPostDetail({ postId })],
            }),
            onSome: () => ({ model: selectedModel }),
          })
        },

        ClickedBackToPosts: model => ({
          model: modifyFields(model, {
            maybeSelectedPostId: () => Option.none(),
          }),
        }),

        ClickedInvalidatePosts: model =>
          applyPostsTransition(model, AsyncData.revalidateOrLoad(model.posts)),

        ClickedRetryPosts: model =>
          applyPostsTransition(model, AsyncData.revalidateOrLoad(model.posts)),

        ClickedRetryPostDetail: (model, { postId }) => ({
          model: modifyFields(model, {
            postDetailById: setPostDetail(postId, PostDetailData.Loading()),
          }),
          commands: [FetchPostDetail({ postId })],
        }),

        CompletedFetchPosts: (model, { result }) => ({
          model: modifyFields(model, { posts: AsyncData.settle(result) }),
        }),

        CompletedFetchPostDetail: (model, { postId, result }) => ({
          model: modifyFields(model, {
            postDetailById: HashMap.modify(postId, AsyncData.settle(result)),
          }),
        }),
      },

      commands: {
        FetchPosts: () =>
          pipe(
            Effect.gen(function* () {
              const posts = yield* fetchPosts
              const fetchedAt = yield* clock.currentTimeMillis

              return FetchedPosts.make({ posts, fetchedAt })
            }),
            Effect.result,
            Effect.map(result => Message.CompletedFetchPosts({ result })),
          ),
        FetchPostDetail: ({ postId }) =>
          pipe(
            Effect.gen(function* () {
              const detail = yield* fetchPostDetail(postId)
              const fetchedAt = yield* clock.currentTimeMillis

              return FetchedPostDetail.make({ detail, fetchedAt })
            }),
            Effect.result,
            Effect.map(result =>
              Message.CompletedFetchPostDetail({ postId, result }),
            ),
          ),
      },

      view: (model, h) =>
        Option.match(model.maybeSelectedPostId, {
          onNone: () =>
            h.section(
              [h.Class('flex flex-col gap-4')],
              [postsListView(model, h)],
            ),
          onSome: postId => postDetailSection({ model, postId }, h),
        }),
    }
  }),
)
