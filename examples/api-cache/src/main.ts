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
import { AsyncData, Command, Runtime, Subscription, Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
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

const foldTabsOutMessage = M.type<Tabs.OutMessage<Tab>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model =>
        activateTab(model, value),
  }),
)

const foldTabs = Update.foldChild({
  update: AppTabs.update,
  read: (model: Model) => Option.some(model.tabs),
  write: (model, nextTabs) => evo(model, { tabs: () => nextTabs }),
  toParentMessage: message => GotTabsMessage({ message }),
  foldOutMessage: foldTabsOutMessage,
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotTabsMessage: ({ message }) => foldTabs(model, message),

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

export const FetchPosts = Command.define('FetchPosts', {
  messages: [SettledFetchPosts],
  execute: pipe(
    Effect.gen(function* () {
      const posts = yield* fetchPosts
      const fetchedAt = yield* Clock.currentTimeMillis
      return FetchedPosts.make({ posts, fetchedAt })
    }),
    Effect.result,
    Effect.map(result => SettledFetchPosts({ result })),
  ),
})

export const FetchPostDetail = Command.define('FetchPostDetail', {
  args: { postId: S.String },
  messages: [SettledFetchPostDetail],
  execute: ({ postId }) =>
    pipe(
      Effect.gen(function* () {
        const detail = yield* fetchPostDetail(postId)
        const fetchedAt = yield* Clock.currentTimeMillis
        return FetchedPostDetail.make({ detail, fetchedAt })
      }),
      Effect.result,
      Effect.map(result => SettledFetchPostDetail({ postId, result })),
    ),
})

export const FetchStats = Command.define('FetchStats', {
  messages: [SettledFetchStats],
  execute: pipe(
    Effect.gen(function* () {
      const stats = yield* fetchStats
      const fetchedAt = yield* Clock.currentTimeMillis
      return FetchedStats.make({ stats, fetchedAt })
    }),
    Effect.result,
    Effect.map(result => SettledFetchStats({ result })),
  ),
})

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
  'px-4 py-2.5 rounded-xl bg-white text-slate-600 font-semibold shadow-sm hover:bg-slate-50 cursor-pointer data-[selected]:bg-indigo-600 data-[selected]:text-white data-[selected]:hover:bg-indigo-600'

const toolbarButtonClassName =
  'px-3 py-1.5 bg-white text-slate-700 text-sm font-semibold rounded-md shadow hover:bg-slate-50 transition cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:hover:bg-white'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'API Cache',
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-slate-100 flex justify-center px-4 py-10 sm:px-6',
      ),
    ],
    [
      h.div(
        [h.Class('w-full max-w-3xl flex flex-col gap-7')],
        [
          headerView(h),
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
                              M.when('Posts', () => postsTabView(model, h)),
                              M.when('Stats', () => statsTabView(model, h)),
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
})

const headerView = (h: HtmlBuilder<Message>): Html =>
  h.header(
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

const postsTabView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(model.maybeSelectedPostId, {
    onNone: () =>
      h.section([h.Class('flex flex-col gap-4')], [postsListView(model, h)]),
    onSome: postId =>
      h.keyed('section')(
        postId,
        [h.Class('flex flex-col gap-4')],
        [postDetailView(model, postId, h)],
      ),
  })

const postsListView = (model: Model, h: HtmlBuilder<Message>): Html => {
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
        onFailure: error => errorPanel(error, ClickedRetryPosts(), h),
        onData: ({ posts }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.posts), {
                onNone: () => [],
                onSome: error => [staleView(error, ClickedRetryPosts(), h)],
              }),
              h.ul(
                [h.Class('flex flex-col gap-2')],
                postListItems(posts, model.postDetailById, h),
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
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  Array.map(posts, post =>
    h.keyed('li')(
      post.id,
      [],
      [
        Button.view(
          {
            onClick: ClickedPost({ postId: post.id }),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    'w-full text-left bg-white rounded-2xl border border-slate-200/80 shadow-sm px-5 py-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4',
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

const postDetailView = (
  model: Model,
  postId: string,
  h: HtmlBuilder<Message>,
): Html => {
  const postDetailData = Option.getOrElse(
    HashMap.get(model.postDetailById, postId),
    () => PostDetailData.Idle(),
  )

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      Button.view(
        {
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
        },
        h,
      ),
      AsyncData.matchDataSplitEmpty(postDetailData, {
        onIdle: () => loadingPanel('Loading post...', h),
        onLoading: () => loadingPanel('Loading post...', h),
        onFailure: error =>
          errorPanel(error, ClickedRetryPostDetail({ postId }), h),
        onData: ({ detail, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postDetailData), {
                onNone: () => [],
                onSome: error => [
                  staleView(error, ClickedRetryPostDetail({ postId }), h),
                ],
              }),
              postDetailCard(detail, fetchedAt, h),
            ],
          ),
      }),
    ],
  )
}

const postDetailCard = (
  detail: PostDetail,
  fetchedAt: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.article(
    [
      h.Class(
        'bg-white rounded-2xl border border-slate-200/80 shadow p-6 flex flex-col gap-3',
      ),
    ],
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

const statsTabView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isPending = AsyncData.isPending(model.stats)

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Stats']),
          Button.view(
            {
              onClick: ClickedRefreshStats(),
              isDisabled: isPending,
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(toolbarButtonClassName)],
                  [isPending ? 'Refreshing...' : 'Refresh'],
                ),
            },
            h,
          ),
        ],
      ),
      h.p(
        [h.Class('text-sm text-slate-500')],
        [
          'Stats refetch every 5 seconds while this tab is open. The old numbers stay on screen while the new ones load.',
        ],
      ),
      AsyncData.matchDataSplitEmpty(model.stats, {
        onIdle: () => loadingPanel('Loading stats...', h),
        onLoading: () => loadingPanel('Loading stats...', h),
        onFailure: error => errorPanel(error, ClickedRetryStats(), h),
        onData: ({ stats, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.stats), {
                onNone: () => [],
                onSome: error => [staleView(error, ClickedRetryStats(), h)],
              }),
              statsCards(
                stats,
                fetchedAt,
                AsyncData.isRefreshing(model.stats),
                h,
              ),
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
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-3')],
    [
      h.div(
        [h.Class('grid grid-cols-3 gap-4')],
        [
          statCard('Active users', `${stats.activeUsers}`, h),
          statCard('Requests per second', `${stats.requestsPerSecond}`, h),
          statCard('Cache hit rate', `${stats.cacheHitRatePercent}%`, h),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-3 text-sm text-slate-500')],
        [
          h.span([], [`Updated at ${formatFetchedAt(fetchedAt)}`]),
          ...(isRefreshing
            ? [
                h.span(
                  [h.Class('text-indigo-600 font-semibold')],
                  ['Refreshing'],
                ),
              ]
            : []),
        ],
      ),
    ],
  )

const statCard = (
  label: string,
  value: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-1',
      ),
    ],
    [
      h.div([h.Class('text-sm text-slate-500')], [label]),
      h.div([h.Class('text-2xl font-bold text-slate-900')], [value]),
    ],
  )

const loadingPanel = (text: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('bg-white rounded-lg shadow p-6 text-center text-slate-500')],
    [text],
  )

const staleView = (
  error: string,
  retryMessage: Message,
  h: HtmlBuilder<Message>,
): Html => errorPanel(error, retryMessage, h)

const errorPanel = (
  error: string,
  retryMessage: Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between gap-4',
      ),
    ],
    [
      h.p([], [error]),
      Button.view(
        {
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
        },
        h,
      ),
    ],
  )
