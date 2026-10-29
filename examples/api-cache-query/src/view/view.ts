import { Array, Match, pipe } from 'effect'

import type { RenderInfo } from '@foldkit/ui/tabs'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
  TabsBinding,
} from '../composition'
import { type Model, TABS_ID, Tab } from '../model'
import { postsTabView } from './posts'
import { statsTabView } from './stats'

const tabButtonClassName =
  'px-4 py-2 rounded-lg bg-white text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer data-[selected]:bg-indigo-600 data-[selected]:text-white data-[selected]:hover:bg-indigo-600'

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'API Cache Query',
  body: h.div(
    [h.Class('min-h-screen bg-slate-100 flex justify-center p-6')],
    [
      h.div(
        [h.Class('w-full max-w-2xl flex flex-col gap-6')],
        [
          headerView(h),
          h.block(
            TabsBinding.embedView({
              slotId: TABS_ID,
              model: model.tabs,
              viewInputs: {
                tabs: Tab.literals,
                selectedValue: model.activeTab,
                ariaLabel: 'API cache sections',
                toView: renderInfo => tabsView({ model, renderInfo }, h),
              },
            }),
          ),
        ],
      ),
    ],
  ),
}))

export const headerView = (h: ApplicationViewBuilder) =>
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

export const tabsView = (
  {
    model,
    renderInfo: { tablist, tabs },
  }: Readonly<{
    model: Model
    renderInfo: RenderInfo<Tab>
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
