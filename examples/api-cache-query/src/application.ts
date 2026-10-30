import {
  Array,
  Duration,
  Effect,
  Layer,
  Match,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Block } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Tabs from '@foldkit/ui/tabs'

import { PostsTab, PostsTabLive } from './postsTab'
import { StatsTab, StatsTabLive, hasStatsData } from './statsTab'

export const TABS_ID = 'api-cache-query-tabs'

const STATS_REFETCH_INTERVAL = Duration.seconds(5)

const Tab = Schema.Literals(['Posts', 'Stats'])
type Tab = typeof Tab.Type

export const AppTabs = Tabs.makeBlock<Tab>()

const Model = Schema.Struct({
  tabs: AppTabs,
  activeTab: Tab,
  postsTab: PostsTab,
  statsTab: StatsTab,
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  TickedStatsRefreshInterval: {},
})
type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

type ApplicationViewBuilder = HtmlBuilder<Message>

const tabButtonClassName =
  'px-4 py-2 rounded-lg bg-white text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer data-[selected]:bg-indigo-600 data-[selected]:text-white data-[selected]:hover:bg-indigo-600'

const loadTab = (model: Model, tab: Tab) =>
  Match.value(tab).pipe(
    Match.when('Posts', () =>
      model.postsTab.send(PostsTab.Message.RequestedLoadIfMissing()),
    ),
    Match.when('Stats', () =>
      model.statsTab.send(StatsTab.Message.RequestedLoadIfMissing()),
    ),
    Match.exhaustive,
  )

const statsRefreshTicks = (isStatsRefreshActive: boolean) =>
  isStatsRefreshActive
    ? pipe(
        Stream.tick(STATS_REFETCH_INTERVAL),
        Stream.drop(1),
        Stream.map(Message.TickedStatsRefreshInterval),
      )
    : Stream.empty

const headerView = (h: ApplicationViewBuilder) =>
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
  {
    model,
    renderInfo: { tablist, tabs },
  }: Readonly<{
    model: Model
    renderInfo: Tabs.RenderInfo<Tab>
  }>,
  h: ApplicationViewBuilder,
) =>
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
                Match.when('Posts', () => model.postsTab.view()),
                Match.when('Stats', () => model.statsTab.view()),
                Match.exhaustive,
              ),
            ],
          ),
        ),
      ),
    ],
  )

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const tabs = yield* new AppTabs('tabs', { id: TABS_ID })
    const postsTab = yield* new PostsTab('postsTab')
    const statsTab = yield* new StatsTab('statsTab')

    return {
      model: {
        tabs,
        activeTab: 'Posts',
        postsTab,
        statsTab,
      },

      update: {
        TickedStatsRefreshInterval: model => ({
          model,
          messages: [
            model.statsTab.send(StatsTab.Message.RequestedRevalidation()),
          ],
        }),
        ...tabs.on<Model>({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { activeTab: () => value }),
            messages: [loadTab(model, value)],
          }),
        }),
      },

      subscriptions: {
        statsRefreshTicks: {
          dependencies: model =>
            model.activeTab === 'Stats' && hasStatsData(model.statsTab.model),
          stream: statsRefreshTicks,
        },
      },

      view: (model, h) => ({
        title: 'API Cache Query',
        body: h.div(
          [h.Class('min-h-screen bg-slate-100 flex justify-center p-6')],
          [
            h.div(
              [h.Class('w-full max-w-2xl flex flex-col gap-6')],
              [
                headerView(h),
                model.tabs.view({
                  tabs: Tab.literals,
                  selectedValue: model.activeTab,
                  ariaLabel: 'API cache sections',
                  toView: renderInfo => tabsView({ model, renderInfo }, h),
                }),
              ],
            ),
          ],
        ),
      }),
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(AppTabs.Live, PostsTabLive, StatsTabLive)))
