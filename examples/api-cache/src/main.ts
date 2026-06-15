import { Button, Tabs } from '@foldkit/ui'
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
import { Command, Runtime, Subscription } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import {
  Post,
  PostDetail,
  Stats,
  fetchPostDetailFromServer,
  fetchPostsFromServer,
  fetchStatsFromServer,
} from './data'

const STATS_REFETCH_INTERVAL = Duration.seconds(5)

export const TABS_ID = 'api-cache-tabs'

// MODEL

const makeRemoteData = <DA, DI>(dataSchema: S.Codec<DA, DI>) => {
  const NotAsked = ts('NotAsked')
  const Loading = ts('Loading')
  const Refreshing = ts('Refreshing', { data: dataSchema, fetchedAt: S.Number })
  const Failure = ts('Failure', { error: S.String })
  const Ok = ts('Ok', { data: dataSchema, fetchedAt: S.Number })

  const Union = S.Union([NotAsked, Loading, Refreshing, Failure, Ok])

  const refetch = (
    current: typeof Union.Type,
  ): Option.Option<typeof Union.Type> =>
    M.value(current).pipe(
      M.withReturnType<Option.Option<typeof Union.Type>>(),
      M.tagsExhaustive({
        NotAsked: () => Option.some(Loading()),
        Loading: () => Option.none(),
        Refreshing: () => Option.none(),
        Failure: () => Option.some(Loading()),
        Ok: ({ data, fetchedAt }) =>
          Option.some(Refreshing({ data, fetchedAt })),
      }),
    )

  return {
    NotAsked,
    Loading,
    Refreshing,
    Failure,
    Ok,
    Union,
    refetch,
  }
}

export const PostsData = makeRemoteData(S.Array(Post))
export const PostDetailData = makeRemoteData(PostDetail)
export const StatsData = makeRemoteData(Stats)

type PostDetailData = typeof PostDetailData.Union.Type

const Tab = S.Literals(['Posts', 'Stats'])
type Tab = typeof Tab.Type

const tabValues: ReadonlyArray<Tab> = Tab.literals

export const AppTabs = Tabs.create<Tab>()

export const Model = S.Struct({
  tabs: Tabs.Model,
  activeTab: Tab,
  posts: PostsData.Union,
  postDetailById: S.HashMap(S.String, PostDetailData.Union),
  maybeSelectedPostId: S.Option(S.String),
  stats: StatsData.Union,
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
export const SucceededFetchPosts = m('SucceededFetchPosts', {
  posts: S.Array(Post),
  fetchedAt: S.Number,
})
export const FailedFetchPosts = m('FailedFetchPosts', { error: S.String })
export const SucceededFetchPostDetail = m('SucceededFetchPostDetail', {
  postId: S.String,
  detail: PostDetail,
  fetchedAt: S.Number,
})
export const FailedFetchPostDetail = m('FailedFetchPostDetail', {
  postId: S.String,
  error: S.String,
})
export const SucceededFetchStats = m('SucceededFetchStats', {
  stats: Stats,
  fetchedAt: S.Number,
})
export const FailedFetchStats = m('FailedFetchStats', { error: S.String })

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
  SucceededFetchPosts,
  FailedFetchPosts,
  SucceededFetchPostDetail,
  FailedFetchPostDetail,
  SucceededFetchStats,
  FailedFetchStats,
])
export type Message = typeof Message.Type

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const refetchPosts = (model: Model): UpdateReturn =>
  Option.match(PostsData.refetch(model.posts), {
    onNone: () => [model, []],
    onSome: nextPosts => [
      evo(model, { posts: () => nextPosts }),
      [FetchPosts()],
    ],
  })

const refetchStats = (model: Model): UpdateReturn =>
  Option.match(StatsData.refetch(model.stats), {
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
      M.value(modelWithActiveTab.posts).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tag('NotAsked', () => [
          evo(modelWithActiveTab, { posts: () => PostsData.Loading() }),
          [FetchPosts()],
        ]),
        M.orElse(() => [modelWithActiveTab, []]),
      ),
    ),
    M.when('Stats', () =>
      M.value(modelWithActiveTab.stats).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tag('NotAsked', () => [
          evo(modelWithActiveTab, { stats: () => StatsData.Loading() }),
          [FetchStats()],
        ]),
        M.orElse(() => [modelWithActiveTab, []]),
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

      ClickedInvalidatePosts: () => refetchPosts(model),

      ClickedRetryPosts: () => refetchPosts(model),

      ClickedRetryPostDetail: ({ postId }) => [
        evo(model, {
          postDetailById: setPostDetail(postId, PostDetailData.Loading()),
        }),
        [FetchPostDetail({ postId })],
      ],

      ClickedRefreshStats: () => refetchStats(model),

      ClickedRetryStats: () => refetchStats(model),

      TickedRevalidateStats: () => refetchStats(model),

      SucceededFetchPosts: ({ posts, fetchedAt }) => [
        evo(model, { posts: () => PostsData.Ok({ data: posts, fetchedAt }) }),
        [],
      ],

      FailedFetchPosts: ({ error }) => [
        evo(model, { posts: () => PostsData.Failure({ error }) }),
        [],
      ],

      SucceededFetchPostDetail: ({ postId, detail, fetchedAt }) => [
        evo(model, {
          postDetailById: setPostDetail(
            postId,
            PostDetailData.Ok({ data: detail, fetchedAt }),
          ),
        }),
        [],
      ],

      FailedFetchPostDetail: ({ postId, error }) => [
        evo(model, {
          postDetailById: setPostDetail(
            postId,
            PostDetailData.Failure({ error }),
          ),
        }),
        [],
      ],

      SucceededFetchStats: ({ stats, fetchedAt }) => [
        evo(model, { stats: () => StatsData.Ok({ data: stats, fetchedAt }) }),
        [],
      ],

      FailedFetchStats: ({ error }) => [
        evo(model, { stats: () => StatsData.Failure({ error }) }),
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
    stats: StatsData.NotAsked(),
  },
  [FetchPosts()],
]

// COMMAND

export const FetchPosts = Command.define(
  'FetchPosts',
  SucceededFetchPosts,
  FailedFetchPosts,
)(
  Effect.gen(function* () {
    const posts = yield* fetchPostsFromServer
    const fetchedAt = yield* Clock.currentTimeMillis
    return SucceededFetchPosts({ posts, fetchedAt })
  }),
)

export const FetchPostDetail = Command.define(
  'FetchPostDetail',
  { postId: S.String },
  SucceededFetchPostDetail,
  FailedFetchPostDetail,
)(({ postId }) =>
  Effect.gen(function* () {
    const detail = yield* fetchPostDetailFromServer(postId)
    const fetchedAt = yield* Clock.currentTimeMillis
    return SucceededFetchPostDetail({ postId, detail, fetchedAt })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedFetchPostDetail({ postId, error })),
    ),
  ),
)

export const FetchStats = Command.define(
  'FetchStats',
  SucceededFetchStats,
  FailedFetchStats,
)(
  Effect.gen(function* () {
    const stats = yield* fetchStatsFromServer
    const fetchedAt = yield* Clock.currentTimeMillis
    return SucceededFetchStats({ stats, fetchedAt })
  }),
)

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  revalidateStats: entry(
    { isObservingStats: S.Boolean },
    {
      modelToDependencies: model => ({
        isObservingStats:
          model.activeTab === 'Stats' &&
          (model.stats._tag === 'Ok' || model.stats._tag === 'Refreshing'),
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

const remoteDataKey = (remoteDataTag: string): string =>
  M.value(remoteDataTag).pipe(
    M.whenOr('Ok', 'Refreshing', () => 'Loaded'),
    M.orElse(() => remoteDataTag),
  )

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

  const isFetchInFlight =
    model.posts._tag === 'Loading' || model.posts._tag === 'Refreshing'

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Posts']),
          Button.view({
            onClick: ClickedInvalidatePosts(),
            isDisabled: isFetchInFlight,
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(toolbarButtonClassName)],
                [
                  M.value(model.posts).pipe(
                    M.tag('Refreshing', () => 'Refreshing...'),
                    M.orElse(() => 'Invalidate'),
                  ),
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
      h.keyed('div')(
        remoteDataKey(model.posts._tag),
        [],
        [
          M.value(model.posts).pipe(
            M.tagsExhaustive({
              NotAsked: () => loadingPanel('Loading posts...'),
              Loading: () => loadingPanel('Loading posts...'),
              Failure: ({ error }) => errorPanel(error, ClickedRetryPosts()),
              Refreshing: ({ data }) =>
                postListItems(data, model.postDetailById),
              Ok: ({ data }) => postListItems(data, model.postDetailById),
            }),
          ),
        ],
      ),
    ],
  )
}

const isPostDetailCached = (
  postDetailById: HashMap.HashMap<string, PostDetailData>,
  postId: string,
): boolean =>
  Option.exists(
    HashMap.get(postDetailById, postId),
    postDetail => postDetail._tag === 'Ok',
  )

const postListItems = (
  posts: ReadonlyArray<Post>,
  postDetailById: HashMap.HashMap<string, PostDetailData>,
): Html => {
  const h = html<Message>()

  return h.ul(
    [h.Class('flex flex-col gap-2')],
    Array.map(posts, post =>
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
          }),
        ],
      ),
    ),
  )
}

const postDetailView = (model: Model, postId: string): Html => {
  const h = html<Message>()

  const postDetailData = Option.getOrElse(
    HashMap.get(model.postDetailById, postId),
    () => PostDetailData.NotAsked(),
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
      h.keyed('div')(
        remoteDataKey(postDetailData._tag),
        [],
        [
          M.value(postDetailData).pipe(
            M.tagsExhaustive({
              NotAsked: () => loadingPanel('Loading post...'),
              Loading: () => loadingPanel('Loading post...'),
              Failure: ({ error }) =>
                errorPanel(error, ClickedRetryPostDetail({ postId })),
              Refreshing: ({ data, fetchedAt }) =>
                postDetailCard(data, fetchedAt),
              Ok: ({ data, fetchedAt }) => postDetailCard(data, fetchedAt),
            }),
          ),
        ],
      ),
    ],
  )
}

const postDetailCard = (detail: PostDetail, fetchedAt: number): Html => {
  const h = html<Message>()

  return h.article(
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

  const isFetchInFlight =
    model.stats._tag === 'Loading' || model.stats._tag === 'Refreshing'

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Stats']),
          Button.view({
            onClick: ClickedRefreshStats(),
            isDisabled: isFetchInFlight,
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(toolbarButtonClassName)],
                [isFetchInFlight ? 'Refreshing...' : 'Refresh'],
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
      h.keyed('div')(
        remoteDataKey(model.stats._tag),
        [],
        [
          M.value(model.stats).pipe(
            M.tagsExhaustive({
              NotAsked: () => loadingPanel('Loading stats...'),
              Loading: () => loadingPanel('Loading stats...'),
              Failure: ({ error }) => errorPanel(error, ClickedRetryStats()),
              Refreshing: ({ data, fetchedAt }) =>
                statsCards(data, fetchedAt, true),
              Ok: ({ data, fetchedAt }) => statsCards(data, fetchedAt, false),
            }),
          ),
        ],
      ),
    ],
  )
}

const statsCards = (
  stats: Stats,
  fetchedAt: number,
  isRefreshing: boolean,
): Html => {
  const h = html<Message>()

  return h.div(
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
          h.span([], [`Updated at ${formatFetchedAt(fetchedAt)}`]),
          isRefreshing
            ? h.span([h.Class('text-indigo-600 font-semibold')], ['Refreshing'])
            : h.empty,
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
