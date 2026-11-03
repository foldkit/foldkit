import { Schema } from 'effect'

import { makeBlock as makeTabsBlock } from '@foldkit/ui/tabs'

export const Tab = Schema.Literals(['AsyncCounter', 'Note Player'])
export type Tab = typeof Tab.Type

export const DemoTabsBlock = makeTabsBlock<Tab>()

export const all: ReadonlyArray<Tab> = ['AsyncCounter', 'Note Player']

export const isActive =
  (tab: Tab) =>
  (activeDemoTab: Tab): boolean =>
    activeDemoTab === tab
