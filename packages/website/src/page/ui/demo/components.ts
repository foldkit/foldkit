import { Listbox, Menu, RadioGroup, Tabs, VirtualList } from '@foldkit/ui'

import type {
  DemoTab,
  ListboxItem,
  Plan,
  VirtualListChatHistoryMode,
  VirtualListChatMessage,
} from '../domain/domain'

export type Character = Readonly<{
  firstName: string
  lastName: string
}>

export const ItemListboxBlock = Listbox.makeBlock<ListboxItem>()
export const ItemMultiListboxBlock = Listbox.Multi.makeBlock<ListboxItem>()
export const CharacterListboxBlock = Listbox.makeBlock<Character>()

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenuBlock = Menu.makeBlock<MenuItem>()

export const PlanRadioGroupBlock = RadioGroup.makeBlock<Plan>()

export const DemoTabsBlock = Tabs.makeBlock<DemoTab>()

import type { Activity } from './virtualListData'

export const ActivityVirtualListBlock = VirtualList.makeBlock<Activity>()
export const ChatVirtualListBlock =
  VirtualList.makeBlock<VirtualListChatMessage>()

export const HistoryModeRadioGroupBlock =
  RadioGroup.makeBlock<VirtualListChatHistoryMode>()
