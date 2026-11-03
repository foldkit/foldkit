import {
  Multi as MultiListbox,
  makeBlock as makeListboxBlock,
} from '@foldkit/ui/listbox'
import { makeBlock as makeMenuBlock } from '@foldkit/ui/menu'
import { makeBlock as makeRadioGroupBlock } from '@foldkit/ui/radioGroup'
import { makeBlock as makeTabsBlock } from '@foldkit/ui/tabs'
import { makeBlock as makeVirtualListBlock } from '@foldkit/ui/virtualList'

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

export const ItemListboxBlock = makeListboxBlock<ListboxItem>()
export const ItemMultiListboxBlock = MultiListbox.makeBlock<ListboxItem>()
export const CharacterListboxBlock = makeListboxBlock<Character>()

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenuBlock = makeMenuBlock<MenuItem>()

export const PlanRadioGroupBlock = makeRadioGroupBlock<Plan>()

export const DemoTabsBlock = makeTabsBlock<DemoTab>()

import type { Activity } from './virtualListData'

export const ActivityVirtualListBlock = makeVirtualListBlock<Activity>()
export const ChatVirtualListBlock =
  makeVirtualListBlock<VirtualListChatMessage>()

export const HistoryModeRadioGroupBlock =
  makeRadioGroupBlock<VirtualListChatHistoryMode>()
