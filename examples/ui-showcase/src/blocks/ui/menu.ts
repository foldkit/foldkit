import { Schema } from 'effect'

import { Menu } from '@foldkit/ui'

export const MenuItem = Schema.Literals([
  'Edit',
  'Duplicate',
  'Archive',
  'Move',
  'Delete',
])
export type MenuItem = typeof MenuItem.Type

export const DemoMenuBlock = Menu.makeBlock(MenuItem)
