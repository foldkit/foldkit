import { Menu } from '@foldkit/ui'

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenu = Menu.create<MenuItem>()
