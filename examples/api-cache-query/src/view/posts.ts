import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'

import * as Button from '@foldkit/ui/button'

import type { ApplicationViewBuilder } from '../composition'
import type { Post, PostDetail } from '../data'
import { Message } from '../message'
import type { Model } from '../model'
import { postQuery, postsQuery } from '../query'
import {
  errorPanel,
  formatFetchedAt,
  loadingPanel,
  toolbarButtonClassName,
} from './shared'

const isPostCached = (
  postDetails: Model['postDetails'],
  postId: string,
): boolean => AsyncData.hasData(postQuery.read(postDetails, { postId }))

export const postsTabView = (model: Model, h: ApplicationViewBuilder) =>
  Option.match(model.maybeSelectedPostId, {
    onNone: () =>
      h.section([h.Class('flex flex-col gap-4')], [postsListView(model, h)]),
    onSome: postId =>
      h.keyed('section')(
        postId,
        [h.Class('flex flex-col gap-4')],
        [postDetailView({ model, postId }, h)],
      ),
  })

export const postsListView = (model: Model, h: ApplicationViewBuilder) => {
  const postsAsyncData = postsQuery.read(model.posts)
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

export const postListItems = (
  {
    posts,
    postDetails,
  }: Readonly<{
    posts: ReadonlyArray<Post>
    postDetails: Model['postDetails']
  }>,
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

export const postDetailView = (
  { model, postId }: Readonly<{ model: Model; postId: string }>,
  h: ApplicationViewBuilder,
) => {
  const postAsyncData = postQuery.read(model.postDetails, { postId })

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

export const postCard = (
  { post, fetchedAt }: Readonly<{ post: PostDetail; fetchedAt: number }>,
  h: ApplicationViewBuilder,
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
