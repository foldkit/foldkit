import {
  Array,
  Clock,
  Duration,
  Effect,
  Match,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Runtime, Subscription, Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Query from 'foldkit/query'
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

const FetchedPosts = Schema.Struct({
  posts: Schema.Array(Post),
  fetchedAt: Schema.Number,
})

const FetchedPostDetail = Schema.Struct({
  detail: PostDetail,
  fetchedAt: Schema.Number,
})

const FetchedStats = Schema.Struct({ stats: Stats, fetchedAt: Schema.Number })

export const postsQuery = Query.define({
  name: 'Posts',
  data: FetchedPosts,
  error: Schema.String,
  execute: Effect.gen(function* () {
    const list = yield* fetchPosts
    const fetchedAt = yield* Clock.currentTimeMillis
    return { posts: list, fetchedAt }
  }),
})

export const statsQuery = Query.define({
  name: 'Stats',
  data: FetchedStats,
  error: Schema.String,
  execute: Effect.gen(function* () {
    const snapshot = yield* fetchStats
    const fetchedAt = yield* Clock.currentTimeMillis
    return { stats: snapshot, fetchedAt }
  }),
})

export const postDetailQuery = Query.define({
  name: 'PostDetail',
  args: { postId: Schema.String },
  data: FetchedPostDetail,
  error: Schema.String,
  execute: ({ postId }) =>
    Effect.gen(function* () {
      const detail = yield* fetchPostDetail(postId)
      const fetchedAt = yield* Clock.currentTimeMillis
      return { detail, fetchedAt }
    }),
})

export const FetchPosts = postsQuery.Fetch
export const FetchPostDetail = postDetailQuery.Fetch
export const FetchStats = statsQuery.Fetch

const Tab = Schema.Literals(['Posts', 'Stats'])
type Tab = typeof Tab.Type

const tabValues: ReadonlyArray<Tab> = Tab.literals

export const AppTabs = Tabs.create<Tab>()

export const Model = Schema.Struct({
  tabs: Tabs.Model,
  activeTab: Tab,
  posts: postsQuery.Model,
  postDetailById: postDetailQuery.Model,
  maybeSelectedPostId: Schema.Option(Schema.String),
  stats: statsQuery.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotTabsMessage: { message: Tabs.Message },
  GotPostsMessage: postsQuery.ParentMessage,
  GotStatsMessage: statsQuery.ParentMessage,
  GotPostDetailMessage: postDetailQuery.ParentMessage,
  ClickedPost: { postId: Schema.String },
  ClickedBackToPosts: {},
  ClickedInvalidatePosts: {},
  ClickedRetryPosts: {},
  ClickedRetryPostDetail: { postId: Schema.String },
  ClickedRefreshStats: {},
  ClickedRetryStats: {},
  TickedRevalidateStats: {},
})

export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

const postsChild = postsQuery.lift<Model, Message>({
  field: 'posts',
  parentMessage: Message.GotPostsMessage,
})

const statsChild = statsQuery.lift<Model, Message>({
  field: 'stats',
  parentMessage: Message.GotStatsMessage,
})

const postDetailChild = postDetailQuery.lift<Model, Message>({
  field: 'postDetailById',
  parentMessage: Message.GotPostDetailMessage,
})

const activateTab = (model: Model, tab: Tab): UpdateReturn => {
  const modelWithActiveTab = modifyFields(model, { activeTab: () => tab })

  return Match.value(tab).pipe(
    Match.withReturnType<UpdateReturn>(),
    Match.when('Posts', () => postsChild.loadIfMissing(modelWithActiveTab)),
    Match.when('Stats', () => statsChild.loadIfMissing(modelWithActiveTab)),
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
    GotPostsMessage: postsChild.fold(model),
    GotStatsMessage: statsChild.fold(model),
    GotPostDetailMessage: postDetailChild.fold(model),
    ClickedPost: ({ postId }) =>
      postDetailChild.loadIfMissing(
        modifyFields(model, {
          maybeSelectedPostId: () => Option.some(postId),
        }),
        { postId },
      ),
    ClickedBackToPosts: () => ({
      model: modifyFields(model, { maybeSelectedPostId: () => Option.none() }),
    }),
    ClickedInvalidatePosts: () => postsChild.revalidateOrLoad(model),
    ClickedRetryPosts: () => postsChild.revalidateOrLoad(model),
    ClickedRetryPostDetail: ({ postId }) =>
      postDetailChild.revalidateOrLoad(model, { postId }),
    ClickedRefreshStats: () => statsChild.revalidateOrLoad(model),
    ClickedRetryStats: () => statsChild.revalidateOrLoad(model),
    TickedRevalidateStats: () => statsChild.revalidate(model),
  })

export const init: Runtime.ApplicationInit<Model, Message> = () =>
  postsChild.revalidateOrLoad({
    tabs: Tabs.init({ id: TABS_ID }),
    activeTab: 'Posts',
    posts: postsQuery.init(),
    postDetailById: postDetailQuery.init(),
    maybeSelectedPostId: Option.none(),
    stats: statsQuery.init(),
  })

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  revalidateStats: entry(
    { isObservingStats: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isObservingStats:
          model.activeTab === 'Stats' && AsyncData.hasData(model.stats),
      }),
      dependenciesToStream: ({ isObservingStats }) =>
        Stream.when(
          Stream.tick(STATS_REFETCH_INTERVAL).pipe(
            Stream.drop(1),
            Stream.map(Message.TickedRevalidateStats),
          ),
          Effect.sync(() => isObservingStats),
        ),
    },
  ),
  watchPostDetail: postDetailChild.watchSubscription(entry, model =>
    Option.match(model.maybeSelectedPostId, {
      onNone: () => [],
      onSome: postId => [{ postId }],
    }),
  ),
}))

// VIEW

const formatFetchedAt = (fetchedAt: number): string =>
  new Date(fetchedAt).toLocaleTimeString()

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
                ),
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
          'Query.define owns fetch, watch, forget, and keyed slots. The parent folds Got* Messages and user intent.',
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
          'Open a post, then go back. watchSubscription is the live key set. A dropped key forgets that slot, including an in-flight Fetch. Open the same post again to load it fresh.',
        ],
      ),
      AsyncData.matchDataSplitEmpty(model.posts, {
        onIdle: () => loadingPanel('Loading posts...', h),
        onLoading: () => loadingPanel('Loading posts...', h),
        onFailure: error => errorPanel(error, Message.ClickedRetryPosts(), h),
        onData: ({ posts }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.posts), {
                onNone: () => [],
                onSome: error => [
                  staleView(error, Message.ClickedRetryPosts(), h),
                ],
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
  postDetailById: Model['postDetailById'],
  postId: string,
): boolean =>
  AsyncData.hasData(postDetailQuery.read(postDetailById, { postId }))

const postListItems = (
  posts: ReadonlyArray<Post>,
  postDetailById: Model['postDetailById'],
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
  const postDetailData = postDetailQuery.read(model.postDetailById, { postId })

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
          errorPanel(error, Message.ClickedRetryPostDetail({ postId }), h),
        onData: ({ detail, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(postDetailData), {
                onNone: () => [],
                onSome: error => [
                  staleView(
                    error,
                    Message.ClickedRetryPostDetail({ postId }),
                    h,
                  ),
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
    [h.Class('bg-white rounded-xl shadow p-6 flex flex-col gap-3')],
    [
      h.h2([h.Class('text-2xl font-bold text-slate-900')], [detail.title]),
      h.p([h.Class('text-sm text-slate-500')], [`By ${detail.author}`]),
      h.p([h.Class('text-slate-700 leading-relaxed')], [detail.body]),
      h.p(
        [h.Class('text-xs text-slate-400')],
        [
          `Fetched at ${formatFetchedAt(fetchedAt)}. Leaving this screen forgets the slot and interrupts an in-flight Fetch for that key.`,
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
              onClick: Message.ClickedRefreshStats(),
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
        onFailure: error => errorPanel(error, Message.ClickedRetryStats(), h),
        onData: ({ stats, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.stats), {
                onNone: () => [],
                onSome: error => [
                  staleView(error, Message.ClickedRetryStats(), h),
                ],
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
