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

export const ItemListbox = Listbox.makeBlock<ListboxItem>()
export const ItemMultiListbox = Listbox.Multi.makeBlock<ListboxItem>()
export const CharacterListbox = Listbox.makeBlock<Character>()

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenu = Menu.makeBlock<MenuItem>()

export const PlanRadioGroup = RadioGroup.makeBlock<Plan>()

export const DemoTabs = Tabs.makeBlock<DemoTab>()

export const ActivityVirtualList = VirtualList.makeBlock<Activity>()
export const ChatVirtualList = VirtualList.makeBlock<VirtualListChatMessage>()

export const HistoryModeRadioGroup =
  RadioGroup.makeBlock<VirtualListChatHistoryMode>()
