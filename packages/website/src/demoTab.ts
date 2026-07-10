import { Schema as S } from 'effect'

import { Tabs } from '@foldkit/ui'

export const Tab = S.Literals(['Architecture', 'Note Player'])
export type Tab = typeof Tab.Type

export const DemoTabs = Tabs.create<Tab>()

export const all: ReadonlyArray<Tab> = ['Architecture', 'Note Player']

export const isActive =
  (tab: Tab) =>
  (activeDemoTab: Tab): boolean =>
    activeDemoTab === tab
