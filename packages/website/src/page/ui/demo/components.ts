import { Listbox, Menu, RadioGroup, Tabs } from '@foldkit/ui'

import type { DemoTab, ListboxItem, Plan } from '../model'

export type Character = Readonly<{
  firstName: string
  lastName: string
}>

export const ItemListbox = Listbox.create<ListboxItem>()
export const ItemMultiListbox = Listbox.Multi.create<ListboxItem>()
export const CharacterListbox = Listbox.create<Character>()

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenu = Menu.create<MenuItem>()

export const PlanRadioGroup = RadioGroup.create<Plan>()

export const DemoTabs = Tabs.create<DemoTab>()
