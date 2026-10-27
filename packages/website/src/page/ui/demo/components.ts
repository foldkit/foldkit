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

export const ItemListboxBlock = Listbox.create<typeof ListboxItem.Type>()
export const ItemMultiListboxBlock =
  Listbox.Multi.create<typeof ListboxItem.Type>()
export const CharacterListboxBlock = Listbox.create<Character>()

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenuBlock = Menu.create<MenuItem>()

export const PlanRadioGroupBlock = RadioGroup.create<typeof Plan.Type>()

export const DemoTabsBlock = Tabs.create<typeof DemoTab.Type>()

import type { Activity } from './virtualListData'

export const ActivityVirtualListBlock = VirtualList.create<Activity>()
export const ChatVirtualListBlock =
  VirtualList.create<typeof VirtualListChatMessage.Type>()

export const HistoryModeRadioGroupBlock =
  RadioGroup.create<typeof VirtualListChatHistoryMode.Type>()
