import { Array, HashMap, Option } from 'effect'
import { AsyncData } from 'foldkit'

import { Button } from '@foldkit/ui'

import type { ApplicationViewBuilder } from '../composition'
import type { Post, PostDetail } from '../data'
import { Message } from '../message'
import { type Model, PostDetailData } from '../model'
import { errorPanel, loadingPanel, toolbarButtonClassName } from './shared'

const formatFetchedAt = (fetchedAt: number): string =>
  new Date(fetchedAt).toLocaleTimeString()

export const postsTabView = (
  maybeSelectedPostId: Model['maybeSelectedPostId'],
  postsData: Model['posts'],
  postDetailById: Model['postDetailById'],
  h: ApplicationViewBuilder,
) =>
  Option.match(maybeSelectedPostId, {
    onNone: () =>
      h.section(
        [h.Class('flex flex-col gap-4')],
        [postsListView(postsData, postDetailById, h)],
      ),
    onSome: postId => postDetailSection(postDetailById, postId, h),
  })

const postsListView = (
  postsData: Model['posts'],
  postDetailById: Model['postDetailById'],
  h: ApplicationViewBuilder,
) => {
  const isPending = AsyncData.isPending(postsData)

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
                    AsyncData.isRefreshing(postsData)
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
      AsyncData.matchDataSplitEmpty(postsData, {
        onIdle: () => loadingPanel('Loading posts...', h),
        onLoading: () => loadingPanel('Loading posts...', h),
        onFailure: error =>
          errorPanel({ error, retryMessage: Message.ClickedRetryPosts() }, h),
        onData: ({ posts }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postsData), {
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
                postListItems({ posts, postDetailById }, h),
              ),
            ],
          ),
      }),
    ],
  )
}

const isPostDetailCached = (
  postDetailById: HashMap.HashMap<string, typeof PostDetailData.schema.Type>,
  postId: string,
): boolean =>
  Option.exists(HashMap.get(postDetailById, postId), AsyncData.hasData)

type PostListItemsInput = Readonly<{
  posts: ReadonlyArray<Post>
  postDetailById: HashMap.HashMap<string, typeof PostDetailData.schema.Type>
}>

const postListItems = (
  { posts, postDetailById }: PostListItemsInput,
  h: ApplicationViewBuilder,
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

const postDetailSection = (
  postDetailById: Model['postDetailById'],
  postId: string,
  h: ApplicationViewBuilder,
) =>
  h.keyed('section')(
    postId,
    [h.Class('flex flex-col gap-4')],
    [postDetailView(postDetailById, postId, h)],
  )

const postDetailView = (
  postDetailById: Model['postDetailById'],
  postId: string,
  h: ApplicationViewBuilder,
) => {
  const postDetailData = Option.getOrElse(
    HashMap.get(postDetailById, postId),
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
  h: ApplicationViewBuilder,
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
