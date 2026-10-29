import { Menu } from '@foldkit/ui'

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenuBlock = Menu.makeBlock<MenuItem>()
