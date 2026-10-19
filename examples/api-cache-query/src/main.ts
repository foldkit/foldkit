import {
  Array,
  Clock,
  DateTime,
  Duration,
  Effect,
  Match,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Runtime, Subscription, Update } from 'foldkit'
import { Query } from 'foldkit/experimental'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

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

export const TABS_ID = 'api-cache-query-tabs'

const PostsData = Schema.Struct({
  posts: Schema.Array(Post),
  fetchedAt: Schema.Number,
})

const PostData = Schema.Struct({
  post: PostDetail,
  fetchedAt: Schema.Number,
})

const StatsData = Schema.Struct({ stats: Stats, fetchedAt: Schema.Number })

export const postsQuery = Query.define({
  name: 'Posts',
  data: PostsData,
  error: Schema.String,
  execute: Effect.gen(function* () {
    const posts = yield* fetchPosts
    const fetchedAt = yield* Clock.currentTimeMillis
    return { posts, fetchedAt }
  }),
})

export const statsQuery = Query.define({
  name: 'Stats',
  data: StatsData,
  error: Schema.String,
  execute: Effect.gen(function* () {
    const stats = yield* fetchStats
    const fetchedAt = yield* Clock.currentTimeMillis
    return { stats, fetchedAt }
  }),
})

export const postQuery = Query.define({
  name: 'Post',
  args: { postId: Schema.String },
  data: PostData,
  error: Schema.String,
  execute: ({ postId }) =>
    Effect.gen(function* () {
      const post = yield* fetchPostDetail(postId)
      const fetchedAt = yield* Clock.currentTimeMillis
      return { post, fetchedAt }
    }),
})

const Tab = Schema.Literals(['Posts', 'Stats'])
type Tab = typeof Tab.Type

export const AppTabs = Tabs.create<Tab>()

export const Model = Schema.Struct({
  tabs: Tabs.Model,
  activeTab: Tab,
  posts: postsQuery.Model,
  postDetails: postQuery.Model,
  maybeSelectedPostId: Schema.Option(Schema.String),
  stats: statsQuery.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotTabsMessage: { message: Tabs.Message },
  GotPostsMessage: { message: postsQuery.Message },
  GotStatsMessage: { message: statsQuery.Message },
  GotPostMessage: { message: postQuery.Message },
  ClickedPost: { postId: Schema.String },
  ClickedBackToPosts: {},
  ClickedRefreshPosts: {},
  ClickedRetryPosts: {},
  ClickedRetryPost: { postId: Schema.String },
  ClickedRefreshStats: {},
  ClickedRetryStats: {},
  TickedStatsRefreshInterval: {},
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

const posts = postsQuery.lift<Model, Message>({
  parentField: 'posts',
  toParentMessage: message => Message.GotPostsMessage({ message }),
})

const stats = statsQuery.lift<Model, Message>({
  parentField: 'stats',
  toParentMessage: message => Message.GotStatsMessage({ message }),
})

const postDetails = postQuery.lift<Model, Message>({
  parentField: 'postDetails',
  toParentMessage: message => Message.GotPostMessage({ message }),
})

const activateTab = (model: Model, tab: Tab): UpdateReturn => {
  const modelWithActiveTab = modifyFields(model, { activeTab: () => tab })

  return Match.value(tab).pipe(
    Match.withReturnType<UpdateReturn>(),
    Match.when('Posts', () => posts.loadIfMissing(modelWithActiveTab)),
    Match.when('Stats', () => stats.loadIfMissing(modelWithActiveTab)),
    Match.exhaustive,
  )
}

const foldTabsOutMessage = Tabs.OutMessage.match<
  Update.Step<Model, Message>,
  Tabs.OutMessage<Tab>
>({
  Selected:
    ({ value }) =>
    model =>
      activateTab(model, value),
})

const foldTabs = Update.foldChild({
  update: AppTabs.update,
  read: (model: Model) => Option.some(model.tabs),
  write: (model, nextTabs) => modifyFields(model, { tabs: () => nextTabs }),
  toParentMessage: message => Message.GotTabsMessage({ message }),
  foldOutMessage: foldTabsOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotTabsMessage: ({ message }) => foldTabs(model, message),
    GotPostsMessage: ({ message }) => posts.fold(model, message),
    GotStatsMessage: ({ message }) => stats.fold(model, message),
    GotPostMessage: ({ message }) => postDetails.fold(model, message),
    ClickedPost: ({ postId }) =>
      postDetails.loadIfMissing(
        modifyFields(model, {
          maybeSelectedPostId: () => Option.some(postId),
        }),
        { postId },
      ),
    ClickedBackToPosts: () => ({
      model: modifyFields(model, { maybeSelectedPostId: () => Option.none() }),
    }),
    ClickedRefreshPosts: () => posts.revalidateOrLoad(model),
    ClickedRetryPosts: () => posts.revalidateOrLoad(model),
    ClickedRetryPost: ({ postId }) =>
      postDetails.revalidateOrLoad(model, { postId }),
    ClickedRefreshStats: () => stats.revalidateOrLoad(model),
    ClickedRetryStats: () => stats.revalidateOrLoad(model),
    TickedStatsRefreshInterval: () => stats.revalidate(model),
  })

export const init: Runtime.ApplicationInit<Model, Message> = () => {
  const model = Model.make({
    tabs: Tabs.init({ id: TABS_ID }),
    activeTab: 'Posts',
    posts: postsQuery.init(),
    postDetails: postQuery.init(),
    maybeSelectedPostId: Option.none(),
    stats: statsQuery.init(),
  })

  return posts.revalidateOrLoad(model)
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  revalidateStats: entry(
    { isStatsRefreshActive: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isStatsRefreshActive:
          model.activeTab === 'Stats' &&
          AsyncData.hasData(statsQuery.read(model.stats)),
      }),
      dependenciesToStream: ({ isStatsRefreshActive }) =>
        Stream.when(
          Stream.tick(STATS_REFETCH_INTERVAL).pipe(
            Stream.drop(1),
            Stream.map(Message.TickedStatsRefreshInterval),
          ),
          Effect.sync(() => isStatsRefreshActive),
        ),
    },
  ),
}))

// VIEW

const formatFetchedAt = (fetchedAt: number): string =>
  DateTime.formatUtc(DateTime.makeUnsafe(fetchedAt), {
    locale: 'en-US',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })

const tabButtonClassName =
  'px-4 py-2 rounded-lg bg-white text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer data-[selected]:bg-indigo-600 data-[selected]:text-white data-[selected]:hover:bg-indigo-600'

const toolbarButtonClassName =
  'px-3 py-1.5 bg-white text-slate-700 text-sm font-semibold rounded-md shadow hover:bg-slate-50 transition cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-default data-[disabled]:hover:bg-white'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'API Cache Query',
  body: h.div(
    [h.Class('min-h-screen bg-slate-100 flex justify-center p-6')],
    [
      h.div(
        [h.Class('w-full max-w-2xl flex flex-col gap-6')],
        [
          headerView(h),
          h.submodel({
            slotId: TABS_ID,
            model: model.tabs,
            view: AppTabs.view,
            viewInputs: {
              tabs: Tab.literals,
              selectedValue: model.activeTab,
              ariaLabel: 'API cache sections',
              toView: renderInfo => tabsView(model, renderInfo, h),
            },
            toParentMessage: message => Message.GotTabsMessage({ message }),
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
          'Query.define owns each fetch and its retained data. The parent decides when each Query should load or refresh.',
        ],
      ),
    ],
  )

const tabsView = (
  model: Model,
  { tablist, tabs }: Tabs.RenderInfo<Tab>,
  h: HtmlBuilder<Message>,
): Html =>
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
              Match.value(tabInfo.value).pipe(
                Match.when('Posts', () => postsTabView(model, h)),
                Match.when('Stats', () => statsTabView(model, h)),
                Match.exhaustive,
              ),
            ],
          ),
        ),
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
        onFailure: error => errorPanel(error, Message.ClickedRetryPosts(), h),
        onData: ({ posts }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postsAsyncData), {
                onNone: () => [],
                onSome: error => [
                  errorPanel(error, Message.ClickedRetryPosts(), h),
                ],
              }),
              h.ul(
                [h.Class('flex flex-col gap-2')],
                postListItems(posts, model.postDetails, h),
              ),
            ],
          ),
      }),
    ],
  )
}

const isPostCached = (
  postDetails: Model['postDetails'],
  postId: string,
): boolean => AsyncData.hasData(postQuery.read(postDetails, { postId }))

const postListItems = (
  posts: ReadonlyArray<Post>,
  postDetails: Model['postDetails'],
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
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
  model: Model,
  postId: string,
  h: HtmlBuilder<Message>,
): Html => {
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
          errorPanel(error, Message.ClickedRetryPost({ postId }), h),
        onData: ({ post, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postAsyncData), {
                onNone: () => [],
                onSome: error => [
                  errorPanel(error, Message.ClickedRetryPost({ postId }), h),
                ],
              }),
              postCard(post, fetchedAt, h),
            ],
          ),
      }),
    ],
  )
}

const postCard = (
  post: PostDetail,
  fetchedAt: number,
  h: HtmlBuilder<Message>,
): Html =>
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

const statsTabView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const statsAsyncData = statsQuery.read(model.stats)
  const isPending = AsyncData.isPending(statsAsyncData)

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Stats']),
          Button.view(
            {
              onClick: Message.ClickedRefreshStats(),
              isDisabled: isPending,
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(toolbarButtonClassName)],
                  [isPending ? 'Refreshing…' : 'Refresh'],
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
      AsyncData.matchData(statsAsyncData, {
        onEmpty: () => loadingPanel('Loading stats…', h),
        onFailure: error => errorPanel(error, Message.ClickedRetryStats(), h),
        onData: ({ stats, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(statsAsyncData), {
                onNone: () => [],
                onSome: error => [
                  errorPanel(error, Message.ClickedRetryStats(), h),
                ],
              }),
              statsCards(
                stats,
                fetchedAt,
                AsyncData.isRefreshing(statsAsyncData),
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
    [h.Class('bg-white rounded-xl shadow p-4 flex flex-col gap-1')],
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
