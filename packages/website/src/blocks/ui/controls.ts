import { Schema } from 'effect'

import { Listbox, Menu, RadioGroup, Tabs, VirtualList } from '@foldkit/ui'

import { ListboxItem } from './domain/domain'
import type {
  DemoTab,
  Plan,
  VirtualListChatHistoryMode,
  VirtualListChatMessage,
} from './domain/domain'

export const Character = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
})
export type Character = typeof Character.Type

export const ItemListboxBlock = Listbox.makeBlock(ListboxItem)
export const ItemMultiListboxBlock = Listbox.Multi.makeBlock(ListboxItem)
export const CharacterListboxBlock = Listbox.makeBlock(Character, Schema.String)

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenuBlock = Menu.makeBlock<MenuItem>()

export const PlanRadioGroupBlock = RadioGroup.makeBlock<Plan>()

export const DemoTabsBlock = Tabs.makeBlock<DemoTab>()

import type { Activity } from './domain/virtualList'

export const ActivityVirtualListBlock = VirtualList.makeBlock<Activity>()
export const ChatVirtualListBlock =
  VirtualList.makeBlock<VirtualListChatMessage>()

export const HistoryModeRadioGroupBlock =
  RadioGroup.makeBlock<VirtualListChatHistoryMode>()
