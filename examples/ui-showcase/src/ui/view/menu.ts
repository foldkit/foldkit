import { Match } from 'effect'
import { type Html, childAttributes } from 'foldkit/html'

import { type GroupHeading, buttonId } from '@foldkit/ui/menu'

import * as Icon from '../../icon'
import {
  MenuAnimatedDemoBinding,
  MenuBasicDemoBinding,
  UiComposition,
} from '../composition'
import type { UiViewBuilder } from '../composition'
import type { MenuItem } from '../menu'

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const basicItemsClassName =
  'w-48 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none'

const animatedItemsClassName =
  'w-48 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const itemClassName =
  'px-3 py-2 text-base text-gray-700 cursor-pointer data-[active]:bg-gray-100 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const headingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400'

const ICON_SIZE = 'w-4 h-4'

const MENU_ITEMS: ReadonlyArray<MenuItem> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Move',
  'Delete',
]

const menuItemIcon = (item: MenuItem): Html =>
  Match.value(item).pipe(
    Match.when('Edit', () => Icon.pencil(ICON_SIZE)),
    Match.when('Duplicate', () => Icon.documentDuplicate(ICON_SIZE)),
    Match.when('Archive', () => Icon.archiveBox(ICON_SIZE)),
    Match.when('Move', () => Icon.arrowRight(ICON_SIZE)),
    Match.when('Delete', () => Icon.trash(ICON_SIZE)),
    Match.exhaustive,
  )

const isItemDisabled = (item: MenuItem): boolean => item === 'Archive'

const itemGroupKey = (item: MenuItem): string =>
  Match.value(item).pipe(
    Match.when('Delete', () => 'Danger'),
    Match.orElse(() => 'Actions'),
  )

const groupToHeading = (
  groupKey: string,
  h: UiViewBuilder,
): GroupHeading | undefined => {
  return Match.value(groupKey).pipe(
    Match.when('Danger', () => ({
      content: h.span([], ['Danger Zone']),
      className: headingClassName,
    })),
    Match.orElse(() => undefined),
  )
}

const MENU_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 4,
  padding: 8,
}

const menuViewConfig = (itemsClassNameValue: string, h: UiViewBuilder) => {
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
    groupToHeading: (groupKey: string) => groupToHeading(groupKey, h),
  }
}

export const view = UiComposition.makeView((model, h) => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Menu']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.label(
        [
          h.For(buttonId(model.menuBasicDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Row actions'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.block(
            MenuBasicDemoBinding.embedView({
              slotId: model.menuBasicDemo.id,
              model: model.menuBasicDemo,
              viewInputs: {
                ...menuViewConfig(basicItemsClassName, h),
              },
            }),
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      h.label(
        [
          h.For(buttonId(model.menuAnimatedDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Row actions'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.block(
            MenuAnimatedDemoBinding.embedView({
              slotId: model.menuAnimatedDemo.id,
              model: model.menuAnimatedDemo,
              viewInputs: {
                ...menuViewConfig(animatedItemsClassName, h),
              },
            }),
          ),
        ],
      ),
    ],
  )
})
