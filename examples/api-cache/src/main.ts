import {
  Array,
  Clock,
  Duration,
  Effect,
  HashMap,
  Match as M,
  Option,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Command, Runtime, Subscription } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Button, Tabs } from '@foldkit/ui'

import {
  Post,
  PostDetail,
  Stats,
  fetchPostDetail,
  fetchPosts,
  fetchStats,
} from './data'

const STATS_REFETCH_INTERVAL = Duration.seconds(5)

export const TABS_ID = 'api-cache-tabs'

// MODEL

const FetchedPosts = S.Struct({ posts: S.Array(Post), fetchedAt: S.Number })

const FetchedPostDetail = S.Struct({
  detail: PostDetail,
  fetchedAt: S.Number,
})

const FetchedStats = S.Struct({ stats: Stats, fetchedAt: S.Number })

export const PostsData = AsyncData.Schema(FetchedPosts, S.String)
export const PostDetailData = AsyncData.Schema(FetchedPostDetail, S.String)
export const StatsData = AsyncData.Schema(FetchedStats, S.String)

type PostsData = typeof PostsData.schema.Type
type PostDetailData = typeof PostDetailData.schema.Type
type StatsData = typeof StatsData.schema.Type

const Tab = S.Literals(['Posts', 'Stats'])
type Tab = typeof Tab.Type

const tabValues: ReadonlyArray<Tab> = Tab.literals

export const AppTabs = Tabs.create<Tab>()

export const Model = S.Struct({
  tabs: Tabs.Model,
  activeTab: Tab,
  posts: PostsData.schema,
  postDetailById: S.HashMap(S.String, PostDetailData.schema),
  maybeSelectedPostId: S.Option(S.String),
  stats: StatsData.schema,
})
export type Model = typeof Model.Type

// MESSAGE

export const GotTabsMessage = m('GotTabsMessage', { message: Tabs.Message })
export const ClickedPost = m('ClickedPost', { postId: S.String })
export const ClickedBackToPosts = m('ClickedBackToPosts')
export const ClickedInvalidatePosts = m('ClickedInvalidatePosts')
export const ClickedRetryPosts = m('ClickedRetryPosts')
export const ClickedRetryPostDetail = m('ClickedRetryPostDetail', {
  postId: S.String,
})
export const ClickedRefreshStats = m('ClickedRefreshStats')
export const ClickedRetryStats = m('ClickedRetryStats')
export const TickedRevalidateStats = m('TickedRevalidateStats')
export const SettledFetchPosts = m('SettledFetchPosts', {
  result: S.Result(FetchedPosts, S.String),
})
export const SettledFetchPostDetail = m('SettledFetchPostDetail', {
  postId: S.String,
  result: S.Result(FetchedPostDetail, S.String),
})
export const SettledFetchStats = m('SettledFetchStats', {
  result: S.Result(FetchedStats, S.String),
})

export const Message = S.Union([
  GotTabsMessage,
  ClickedPost,
  ClickedBackToPosts,
  ClickedInvalidatePosts,
  ClickedRetryPosts,
  ClickedRetryPostDetail,
  ClickedRefreshStats,
  ClickedRetryStats,
  TickedRevalidateStats,
  SettledFetchPosts,
  SettledFetchPostDetail,
  SettledFetchStats,
])
export type Message = typeof Message.Type

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const applyPostsTransition = (
  model: Model,
  maybeNextPosts: Option.Option<PostsData>,
): UpdateReturn =>
  Option.match(maybeNextPosts, {
    onNone: () => [model, []],
    onSome: nextPosts => [
      evo(model, { posts: () => nextPosts }),
      [FetchPosts()],
    ],
  })

const applyStatsTransition = (
  model: Model,
  maybeNextStats: Option.Option<StatsData>,
): UpdateReturn =>
  Option.match(maybeNextStats, {
    onNone: () => [model, []],
    onSome: nextStats => [
      evo(model, { stats: () => nextStats }),
      [FetchStats()],
    ],
  })

const setPostDetail = (postId: string, postDetail: PostDetailData) =>
  HashMap.set(postId, postDetail)

const activateTab = (model: Model, tab: Tab): UpdateReturn => {
  const modelWithActiveTab = evo(model, { activeTab: () => tab })

  return M.value(tab).pipe(
    M.withReturnType<UpdateReturn>(),
    M.when('Posts', () =>
      applyPostsTransition(
        modelWithActiveTab,
        AsyncData.loadIfMissing(modelWithActiveTab.posts),
      ),
    ),
    M.when('Stats', () =>
      applyStatsTransition(
        modelWithActiveTab,
        AsyncData.loadIfMissing(modelWithActiveTab.stats),
      ),
    ),
    M.exhaustive,
  )
}

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotTabsMessage: ({ message }) => {
        const [nextTabs, tabsCommands, maybeOutMessage] = AppTabs.update(
          model.tabs,
          message,
        )

        const tabsModel = evo(model, { tabs: () => nextTabs })
        const mappedCommands = Command.mapMessages(tabsCommands, message =>
          GotTabsMessage({ message }),
        )

        return Option.match(maybeOutMessage, {
          onNone: () => [tabsModel, mappedCommands],
          onSome: M.type<Tabs.OutMessage<Tab>>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Selected: ({ value }) => {
                const [activatedModel, activationCommands] = activateTab(
                  tabsModel,
                  value,
                )

                return [
                  activatedModel,
                  Array.appendAll(mappedCommands, activationCommands),
                ]
              },
            }),
          ),
        })
      },

      ClickedPost: ({ postId }) => {
        const selectedModel = evo(model, {
          maybeSelectedPostId: () => Option.some(postId),
        })

        return Option.match(HashMap.get(model.postDetailById, postId), {
          onNone: () => [
            evo(selectedModel, {
              postDetailById: setPostDetail(postId, PostDetailData.Loading()),
            }),
            [FetchPostDetail({ postId })],
          ],
          onSome: () => [selectedModel, []],
        })
      },

      ClickedBackToPosts: () => [
        evo(model, { maybeSelectedPostId: () => Option.none() }),
        [],
      ],

      ClickedInvalidatePosts: () =>
        applyPostsTransition(model, AsyncData.revalidateOrLoad(model.posts)),

      ClickedRetryPosts: () =>
        applyPostsTransition(model, AsyncData.revalidateOrLoad(model.posts)),

      ClickedRetryPostDetail: ({ postId }) => [
        evo(model, {
          postDetailById: setPostDetail(postId, PostDetailData.Loading()),
        }),
        [FetchPostDetail({ postId })],
      ],

      ClickedRefreshStats: () =>
        applyStatsTransition(model, AsyncData.revalidateOrLoad(model.stats)),

      ClickedRetryStats: () =>
        applyStatsTransition(model, AsyncData.revalidateOrLoad(model.stats)),

      TickedRevalidateStats: () =>
        applyStatsTransition(model, AsyncData.revalidate(model.stats)),

      SettledFetchPosts: ({ result }) => [
        evo(model, { posts: AsyncData.settle(result) }),
        [],
      ],

      SettledFetchPostDetail: ({ postId, result }) => [
        evo(model, {
          postDetailById: HashMap.modify(postId, AsyncData.settle(result)),
        }),
        [],
      ],

      SettledFetchStats: ({ result }) => [
        evo(model, { stats: AsyncData.settle(result) }),
        [],
      ],
    }),
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    tabs: Tabs.init({ id: TABS_ID }),
    activeTab: 'Posts',
    posts: PostsData.Loading(),
    postDetailById: HashMap.empty(),
    maybeSelectedPostId: Option.none(),
    stats: StatsData.Idle(),
  },
  [FetchPosts()],
]

// COMMAND

export const FetchPosts = Command.define(
  'FetchPosts',
  SettledFetchPosts,
)(
  pipe(
    Effect.gen(function* () {
      const posts = yield* fetchPosts
      const fetchedAt = yield* Clock.currentTimeMillis
      return FetchedPosts.make({ posts, fetchedAt })
    }),
    Effect.result,
    Effect.map(result => SettledFetchPosts({ result })),
  ),
)

export const FetchPostDetail = Command.define(
  'FetchPostDetail',
  { postId: S.String },
  SettledFetchPostDetail,
)(({ postId }) =>
  pipe(
    Effect.gen(function* () {
      const detail = yield* fetchPostDetail(postId)
      const fetchedAt = yield* Clock.currentTimeMillis
      return FetchedPostDetail.make({ detail, fetchedAt })
    }),
    Effect.result,
    Effect.map(result => SettledFetchPostDetail({ postId, result })),
  ),
)

export const FetchStats = Command.define(
  'FetchStats',
  SettledFetchStats,
)(
  pipe(
    Effect.gen(function* () {
      const stats = yield* fetchStats
      const fetchedAt = yield* Clock.currentTimeMillis
      return FetchedStats.make({ stats, fetchedAt })
    }),
    Effect.result,
    Effect.map(result => SettledFetchStats({ result })),
  ),
)

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  revalidateStats: entry(
    { isObservingStats: S.Boolean },
    {
      modelToDependencies: model => ({
        isObservingStats:
          model.activeTab === 'Stats' && AsyncData.hasData(model.stats),
      }),
      dependenciesToStream: ({ isObservingStats }) =>
        Stream.when(
          // NOTE: Stream.tick emits once immediately. Drop that first
          // emission so freshly loaded stats are not refetched instantly.
          Stream.tick(STATS_REFETCH_INTERVAL).pipe(
            Stream.drop(1),
            Stream.map(TickedRevalidateStats),
          ),
          Effect.sync(() => isObservingStats),
        ),
    },
  ),
}))

// VIEW

const formatFetchedAt = (fetchedAt: number): string =>
  new Date(fetchedAt).toLocaleTimeString()

const tabButtonClassName =
  'px-4 py-2 rounded-lg bg-white text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer data-[selected]:bg-indigo-600 data-[selected]:text-white data-[selected]:hover:bg-indigo-600'

const toolbarButtonClassName =
  'px-3 py-1.5 bg-white text-slate-700 text-sm font-semibold rounded-md shadow hover:bg-slate-50 transition cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-default data-[disabled]:hover:bg-white'

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'API Cache',
    body: h.div(
      [h.Class('min-h-screen bg-slate-100 flex justify-center p-6')],
      [
        h.div(
          [h.Class('w-full max-w-2xl flex flex-col gap-6')],
          [
            headerView(),
            h.submodel({
              slotId: TABS_ID,
              model: model.tabs,
              view: AppTabs.view,
              viewInputs: {
                tabs: tabValues,
                selectedValue: model.activeTab,
                ariaLabel: 'API cache sections',
                toView: ({ tablist, tabs }) =>
                  h.div(
                    [h.Class('flex flex-col gap-6')],
                    [
                      h.div(
                        [...tablist, h.Class('flex gap-2')],
                        Array.map(tabs, tabInfo =>
                          h.keyed('button')(
                            tabInfo.value,
                            [...tabInfo.tab, h.Class(tabButtonClassName)],
                            [tabInfo.value],
                          ),
                        ),
                      ),
                      ...pipe(
                        tabs,
                        Array.filter(tabInfo => tabInfo.isActive),
                        Array.map(tabInfo =>
                          h.keyed('div')(
                            tabInfo.value,
                            [...tabInfo.panel, h.Class('flex flex-col gap-4')],
                            [
                              M.value(tabInfo.value).pipe(
                                M.when('Posts', () => postsTabView(model)),
                                M.when('Stats', () => statsTabView(model)),
                                M.exhaustive,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
              },
              toParentMessage: message => GotTabsMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  }
}

const headerView = (): Html => {
  const h = html<Message>()

  return h.header(
    [h.Class('flex flex-col gap-1')],
    [
      h.h1([h.Class('text-3xl font-bold text-slate-900')], ['API Cache']),
      h.p(
        [h.Class('text-slate-600')],
        [
          'Query client patterns written as ordinary Model state, update logic, and one Subscription.',
        ],
      ),
    ],
  )
}

const postsTabView = (model: Model): Html => {
  const h = html<Message>()

  return Option.match(model.maybeSelectedPostId, {
    onNone: () =>
      h.keyed('section')(
        'PostsList',
        [h.Class('flex flex-col gap-4')],
        [postsListView(model)],
      ),
    onSome: postId =>
      h.keyed('section')(
        postId,
        [h.Class('flex flex-col gap-4')],
        [postDetailView(model, postId)],
      ),
  })
}

const postsListView = (model: Model): Html => {
  const h = html<Message>()

  const isPending = AsyncData.isPending(model.posts)

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Posts']),
          Button.view({
            onClick: ClickedInvalidatePosts(),
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
          }),
        ],
      ),
      h.p(
        [h.Class('text-sm text-slate-500')],
        [
          'Open a post, go back, and open it again. The second visit renders instantly from the Model. Invalidate marks the list stale and refetches it while the current list stays on screen.',
        ],
      ),
      AsyncData.matchDataSplitEmpty(model.posts, {
        onIdle: () =>
          h.keyed('div')('Idle', [], [loadingPanel('Loading posts...')]),
        onLoading: () =>
          h.keyed('div')('Loading', [], [loadingPanel('Loading posts...')]),
        onFailure: error =>
          h.keyed('div')(
            'Failure',
            [],
            [errorPanel(error, ClickedRetryPosts())],
          ),
        onData: ({ posts }) =>
          h.keyed('div')(
            'Loaded',
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.posts), {
                onNone: () => [],
                onSome: error => [staleView(error, ClickedRetryPosts())],
              }),
              h.keyed('ul')(
                'list',
                [h.Class('flex flex-col gap-2')],
                postListItems(posts, model.postDetailById),
              ),
            ],
          ),
      }),
    ],
  )
}

const isPostDetailCached = (
  postDetailById: HashMap.HashMap<string, PostDetailData>,
  postId: string,
): boolean =>
  Option.exists(HashMap.get(postDetailById, postId), AsyncData.hasData)

const postListItems = (
  posts: ReadonlyArray<Post>,
  postDetailById: HashMap.HashMap<string, PostDetailData>,
): ReadonlyArray<Html> => {
  const h = html<Message>()

  return Array.map(posts, post =>
    h.keyed('li')(
      post.id,
      [],
      [
        Button.view({
          onClick: ClickedPost({ postId: post.id }),
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
                    h.div([h.Class('text-sm text-slate-500')], [post.excerpt]),
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
        }),
      ],
    ),
  )
}

const postDetailView = (model: Model, postId: string): Html => {
  const h = html<Message>()

  const postDetailData = Option.getOrElse(
    HashMap.get(model.postDetailById, postId),
    () => PostDetailData.Idle(),
  )

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      Button.view({
        onClick: ClickedBackToPosts(),
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
      }),
      AsyncData.matchDataSplitEmpty(postDetailData, {
        onIdle: () =>
          h.keyed('div')('Idle', [], [loadingPanel('Loading post...')]),
        onLoading: () =>
          h.keyed('div')('Loading', [], [loadingPanel('Loading post...')]),
        onFailure: error =>
          h.keyed('div')(
            'Failure',
            [],
            [errorPanel(error, ClickedRetryPostDetail({ postId }))],
          ),
        onData: ({ detail, fetchedAt }) =>
          h.keyed('div')(
            'Loaded',
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postDetailData), {
                onNone: () => [],
                onSome: error => [
                  staleView(error, ClickedRetryPostDetail({ postId })),
                ],
              }),
              postDetailCard(detail, fetchedAt),
            ],
          ),
      }),
    ],
  )
}

const postDetailCard = (detail: PostDetail, fetchedAt: number): Html => {
  const h = html<Message>()

  return h.keyed('article')(
    'detail',
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
}

const statsTabView = (model: Model): Html => {
  const h = html<Message>()

  const isPending = AsyncData.isPending(model.stats)

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Stats']),
          Button.view({
            onClick: ClickedRefreshStats(),
            isDisabled: isPending,
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(toolbarButtonClassName)],
                [isPending ? 'Refreshing...' : 'Refresh'],
              ),
          }),
        ],
      ),
      h.p(
        [h.Class('text-sm text-slate-500')],
        [
          'Stats refetch every 5 seconds while this tab is open. The old numbers stay on screen while the new ones load.',
        ],
      ),
      AsyncData.matchDataSplitEmpty(model.stats, {
        onIdle: () =>
          h.keyed('div')('Idle', [], [loadingPanel('Loading stats...')]),
        onLoading: () =>
          h.keyed('div')('Loading', [], [loadingPanel('Loading stats...')]),
        onFailure: error =>
          h.keyed('div')(
            'Failure',
            [],
            [errorPanel(error, ClickedRetryStats())],
          ),
        onData: ({ stats, fetchedAt }) =>
          h.keyed('div')(
            'Loaded',
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.stats), {
                onNone: () => [],
                onSome: error => [staleView(error, ClickedRetryStats())],
              }),
              statsCards(stats, fetchedAt, AsyncData.isRefreshing(model.stats)),
            ],
          ),
      }),
    ],
  )
}

const statsCards = (
  stats: Stats,
  fetchedAt: number,
  isRefreshing: boolean,
): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'stats',
    [h.Class('flex flex-col gap-3')],
    [
      h.div(
        [h.Class('grid grid-cols-3 gap-4')],
        [
          statCard('Active users', `${stats.activeUsers}`),
          statCard('Requests per second', `${stats.requestsPerSecond}`),
          statCard('Cache hit rate', `${stats.cacheHitRatePercent}%`),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-3 text-sm text-slate-500')],
        [
          h.keyed('span')(
            'updatedAt',
            [],
            [`Updated at ${formatFetchedAt(fetchedAt)}`],
          ),
          ...(isRefreshing
            ? [
                h.keyed('span')(
                  'refreshing',
                  [h.Class('text-indigo-600 font-semibold')],
                  ['Refreshing'],
                ),
              ]
            : []),
        ],
      ),
    ],
  )
}

const statCard = (label: string, value: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('bg-white rounded-xl shadow p-4 flex flex-col gap-1')],
    [
      h.div([h.Class('text-sm text-slate-500')], [label]),
      h.div([h.Class('text-2xl font-bold text-slate-900')], [value]),
    ],
  )
}

const loadingPanel = (text: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('bg-white rounded-lg shadow p-6 text-center text-slate-500')],
    [text],
  )
}

const staleView = (error: string, retryMessage: Message): Html => {
  const h = html<Message>()

  return h.keyed('div')('stale', [], [errorPanel(error, retryMessage)])
}

const errorPanel = (error: string, retryMessage: Message): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between gap-4',
      ),
    ],
    [
      h.p([], [error]),
      Button.view({
        onClick: retryMessage,
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(
                'shrink-0 px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 transition cursor-pointer',
              ),
            ],
            ['Retry'],
          ),
      }),
    ],
  )
}
