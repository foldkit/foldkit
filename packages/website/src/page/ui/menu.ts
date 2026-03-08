import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/menu'

import { Class, div, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import {
  GotMenuAnimatedDemoMessage,
  GotMenuBasicDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const menuHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'menu',
  text: 'Menu',
}

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic-menu',
  text: 'Basic',
}

export const animatedHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'animated-menu',
  text: 'Animated',
}

// DEMO CONTENT

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const basicItemsClassName =
  'absolute mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg overflow-hidden z-10 outline-none'

const animatedItemsClassName =
  'absolute mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg overflow-hidden z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const itemClassName =
  'px-3 py-2 text-base text-gray-700 dark:text-gray-200 cursor-pointer data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700/50 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const headingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500'

const ICON_SIZE = 'w-4 h-4'

type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

const MENU_ITEMS: ReadonlyArray<MenuItem> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Move',
  'Delete',
]

const menuItemIcon = (item: MenuItem): Html =>
  M.value(item).pipe(
    M.when('Edit', () => Icon.pencil(ICON_SIZE)),
    M.when('Duplicate', () => Icon.documentDuplicate(ICON_SIZE)),
    M.when('Archive', () => Icon.archiveBox(ICON_SIZE)),
    M.when('Move', () => Icon.arrowRight(ICON_SIZE)),
    M.when('Delete', () => Icon.trash(ICON_SIZE)),
    M.exhaustive,
  )

const isItemDisabled = (item: MenuItem): boolean => item === 'Archive'

const itemGroupKey = (item: MenuItem): string =>
  M.value(item).pipe(
    M.when('Delete', () => 'Danger'),
    M.orElse(() => 'Actions'),
  )

const groupToHeading = (groupKey: string): Ui.Menu.GroupHeading | undefined =>
  M.value(groupKey).pipe(
    M.when('Danger', () => ({
      content: span([], ['Danger Zone']),
      className: headingClassName,
    })),
    M.orElse(() => undefined),
  )

// VIEW

const MENU_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const menuViewConfig = (itemsClassName: string) => ({
  anchor: MENU_ANCHOR,
  items: MENU_ITEMS,
  itemToConfig: (item: MenuItem) => ({
    className: itemClassName,
    content: div(
      [Class('flex items-center gap-2.5')],
      [menuItemIcon(item), span([], [item])],
    ),
  }),
  isItemDisabled,
  buttonContent: div(
    [Class('flex items-center gap-4')],
    [span([], ['Actions']), Icon.chevronDown('w-4 h-4')],
  ),
  buttonClassName: triggerClassName,
  itemsClassName,
  backdropClassName,
  className: wrapperClassName,
  itemGroupKey,
  groupToHeading,
})

export const basicDemo = (
  menuModel: Ui.Menu.Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', basicHeader.id, basicHeader.text),
  div(
    [Class('relative')],
    [
      Ui.Menu.view({
        model: menuModel,
        toMessage: message => toMessage(GotMenuBasicDemoMessage({ message })),
        ...menuViewConfig(basicItemsClassName),
      }),
    ],
  ),
]

export const animatedDemo = (
  menuModel: Ui.Menu.Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', animatedHeader.id, animatedHeader.text),
  div(
    [Class('relative')],
    [
      Ui.Menu.view({
        model: menuModel,
        toMessage: message => toMessage(GotMenuAnimatedDemoMessage({ message })),
        ...menuViewConfig(animatedItemsClassName),
      }),
    ],
  ),
]
