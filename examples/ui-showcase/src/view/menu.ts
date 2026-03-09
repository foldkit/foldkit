import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, h2, h3, span } from '../html'
import * as Icon from '../icon'
import type { Message as ParentMessage } from '../main'
import {
  GotMenuAnimatedDemoMessage,
  GotMenuBasicDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const basicItemsClassName =
  'absolute mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none'

const animatedItemsClassName =
  'absolute mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const itemClassName =
  'px-3 py-2 text-base text-gray-700 cursor-pointer data-[active]:bg-gray-100 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const headingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400'

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

const MENU_ANCHOR = {
  placement: 'bottom-start' as const,
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

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Menu']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      div(
        [Class('relative')],
        [
          Ui.Menu.view({
            model: model.menuBasicDemo,
            toMessage: message =>
              toMessage(GotMenuBasicDemoMessage({ message })),
            ...menuViewConfig(basicItemsClassName),
          }),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      div(
        [Class('relative')],
        [
          Ui.Menu.view({
            model: model.menuAnimatedDemo,
            toMessage: message =>
              toMessage(GotMenuAnimatedDemoMessage({ message })),
            ...menuViewConfig(animatedItemsClassName),
          }),
        ],
      ),
    ],
  )
