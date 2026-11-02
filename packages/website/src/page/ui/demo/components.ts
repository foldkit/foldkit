import { Listbox, Menu, RadioGroup, Tabs, VirtualList } from '@foldkit/ui'

import type {
  DemoTab,
  ListboxItem,
  Plan,
  VirtualListChatHistoryMode,
  VirtualListChatMessage,
} from '../domain/domain'
import type { Activity } from './virtualListData'

export type Character = Readonly<{
  firstName: string
  lastName: string
}>

export const ItemListbox = Listbox.make<ListboxItem>()
export const ItemMultiListbox = Listbox.Multi.make<ListboxItem>()
export const CharacterListbox = Listbox.make<Character>()

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenu = Menu.make<MenuItem>()

export const PlanRadioGroup = RadioGroup.make<Plan>()

export const DemoTabs = Tabs.make<DemoTab>()

export const ActivityVirtualList = VirtualList.make<Activity>()
export const ChatVirtualList = VirtualList.make<VirtualListChatMessage>()

export const HistoryModeRadioGroup =
  RadioGroup.make<VirtualListChatHistoryMode>()
