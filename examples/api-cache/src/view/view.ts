import { Array, Match, pipe } from 'effect'

import { ApplicationComposition, TabsBinding } from '../composition'
import { TABS_ID, Tab } from '../model'
import { postsTabView } from './posts'
import { headerView } from './shared'
import { statsTabView } from './stats'

const tabButtonClassName =
  'px-4 py-2 rounded-lg bg-white text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer data-[selected]:bg-indigo-600 data-[selected]:text-white data-[selected]:hover:bg-indigo-600'

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'API Cache',
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
                toView: ({ tablist, tabs: tabInfos }) =>
                  h.div(
                    [h.Class('flex flex-col gap-6')],
                    [
                      h.div(
                        [...tablist, h.Class('flex gap-2')],
                        Array.map(tabInfos, tabInfo =>
                          h.keyed('button')(
                            tabInfo.value,
                            [...tabInfo.tab, h.Class(tabButtonClassName)],
                            [tabInfo.value],
                          ),
                        ),
                      ),
                      ...pipe(
                        tabInfos,
                        Array.filter(tabInfo => tabInfo.isActive),
                        Array.map(tabInfo =>
                          h.keyed('div')(
                            tabInfo.value,
                            [...tabInfo.panel, h.Class('flex flex-col gap-4')],
                            [
                              Match.value(tabInfo.value).pipe(
                                Match.when('Posts', () =>
                                  postsTabView(model, h),
                                ),
                                Match.when('Stats', () =>
                                  statsTabView(model, h),
                                ),
                                Match.exhaustive,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
              },
            }),
          ),
        ],
      ),
    ],
  ),
}))
