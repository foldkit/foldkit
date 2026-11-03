import { makeBlock as makeMenuBlock } from '@foldkit/ui/menu'

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenuBlock = makeMenuBlock<MenuItem>()
