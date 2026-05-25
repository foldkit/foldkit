import { Match as M } from 'effect'
import { Submodel, Ui } from 'foldkit'
import { Html, childAttributes, html } from 'foldkit/html'

import * as Icon from '../../icon'
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

const ActionMenu = Ui.Menu.create<MenuItem>()

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

const groupToHeading = (groupKey: string): Ui.Menu.GroupHeading | undefined => {
  const h = html()

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

const menuViewConfig = (itemsClassNameValue: string) => {
  const h = html<UiMessage>()

  return {
    anchor: MENU_ANCHOR,
    items: MENU_ITEMS,
    itemToConfig: (item: MenuItem) => ({
      className: itemClassName,
      content: h.div(
        [h.Class('flex items-center gap-2.5')],
        [menuItemIcon(item), h.span([], [item])],
      ),
    }),
    isItemDisabled,
    buttonContent: h.div(
      [h.Class('flex items-center gap-4')],
      [h.span([], ['Actions']), Icon.chevronDown('w-4 h-4')],
    ),
    buttonAttributes: childAttributes([h.Class(triggerClassName)]),
    itemsAttributes: childAttributes([h.Class(itemsClassNameValue)]),
    backdropAttributes: childAttributes([h.Class(backdropClassName)]),
    attributes: childAttributes([h.Class(wrapperClassName)]),
    itemGroupKey,
    groupToHeading,
  }
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

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
          h.submodel({
            slotId: model.menuBasicDemo.id,
            model: model.menuBasicDemo,
            view: ActionMenu.view,
            viewInputs: menuViewConfig(basicItemsClassName),
            toParentMessage: message => GotMenuBasicDemoMessage({ message }),
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
          h.submodel({
            slotId: model.menuAnimatedDemo.id,
            model: model.menuAnimatedDemo,
            view: ActionMenu.view,
            viewInputs: menuViewConfig(animatedItemsClassName),
            toParentMessage: message => GotMenuAnimatedDemoMessage({ message }),
          }),
        ],
      ),
    ],
  )
})
