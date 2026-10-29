import { Schema } from 'effect'

import { Tabs } from '@foldkit/ui'

export const Tab = Schema.Literals(['AsyncCounter', 'Note Player'])
export type Tab = typeof Tab.Type

export const DemoTabsBlock = Tabs.makeBlock<Tab>()

export const all: ReadonlyArray<Tab> = ['AsyncCounter', 'Note Player']

export const isActive =
  (tab: Tab) =>
  (activeDemoTab: Tab): boolean =>
    activeDemoTab === tab
