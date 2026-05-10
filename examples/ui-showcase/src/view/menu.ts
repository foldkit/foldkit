import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import * as Icon from '../icon'
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

const menuItemIcon = <ParentMessage>(item: MenuItem): Html =>
  M.value(item).pipe(
    M.when('Edit', () => Icon.pencil<ParentMessage>(ICON_SIZE)),
    M.when('Duplicate', () => Icon.documentDuplicate<ParentMessage>(ICON_SIZE)),
    M.when('Archive', () => Icon.archiveBox<ParentMessage>(ICON_SIZE)),
    M.when('Move', () => Icon.arrowRight<ParentMessage>(ICON_SIZE)),
    M.when('Delete', () => Icon.trash<ParentMessage>(ICON_SIZE)),
    M.exhaustive,
  )

const isItemDisabled = (item: MenuItem): boolean => item === 'Archive'

const itemGroupKey = (item: MenuItem): string =>
  M.value(item).pipe(
    M.when('Delete', () => 'Danger'),
    M.orElse(() => 'Actions'),
  )

const groupToHeading = <ParentMessage>(
  groupKey: string,
): Ui.Menu.GroupHeading | undefined => {
  const h = html<ParentMessage>()

  return M.value(groupKey).pipe(
    M.when('Danger', () => ({
      content: h.span([], ['Danger Zone']),
      className: headingClassName,
    })),
    M.orElse(() => undefined),
  )
}

const MENU_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 4,
  padding: 8,
}

const menuViewConfig = <ParentMessage>(itemsClassNameValue: string) => {
  const h = html<ParentMessage>()

  return {
    anchor: MENU_ANCHOR,
    items: MENU_ITEMS,
    itemToConfig: (item: MenuItem) => ({
      className: itemClassName,
      content: h.div(
        [h.Class('flex items-center gap-2.5')],
        [menuItemIcon<ParentMessage>(item), h.span([], [item])],
      ),
    }),
    isItemDisabled,
    buttonContent: h.div(
      [h.Class('flex items-center gap-4')],
      [h.span([], ['Actions']), Icon.chevronDown<ParentMessage>('w-4 h-4')],
    ),
    buttonAttributes: [h.Class(triggerClassName)],
    itemsAttributes: [h.Class(itemsClassNameValue)],
    backdropAttributes: [h.Class(backdropClassName)],
    attributes: [h.Class(wrapperClassName)],
    itemGroupKey,
    groupToHeading: (groupKey: string) =>
      groupToHeading<ParentMessage>(groupKey),
  }
}

export const view = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Menu']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('relative')],
        [
          Ui.Menu.view({
            model: model.menuBasicDemo,
            toParentMessage: message =>
              toParentMessage(GotMenuBasicDemoMessage({ message })),
            ...menuViewConfig<ParentMessage>(basicItemsClassName),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      h.div(
        [h.Class('relative')],
        [
          Ui.Menu.view({
            model: model.menuAnimatedDemo,
            toParentMessage: message =>
              toParentMessage(GotMenuAnimatedDemoMessage({ message })),
            ...menuViewConfig<ParentMessage>(animatedItemsClassName),
          }),
        ],
      ),
    ],
  )
}
