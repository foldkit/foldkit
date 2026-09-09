import { Match } from 'effect'
import {
  Html,
  type HtmlBuilder,
  childAttributes,
  inertHtml as ih,
} from 'foldkit/html'

import { Menu } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/menu'

import { Icon } from '../../../icon'
import { Message } from '../message'

// DEMO CONTENT

const triggerClassName = 'demo-neutral-button inline-flex items-center gap-1.5'

const basicItemsClassName = 'demo-popup-surface w-48 overflow-hidden'

const animatedItemsClassName = `${basicItemsClassName} transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0`

const itemClassName = 'demo-option'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const headingClassName = 'demo-option-heading'

const ICON_SIZE = 'w-4 h-4'

export type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

export const DemoMenu = Menu.create<MenuItem>()

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

// VIEW

const MENU_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const menuViewConfig = (itemsClassName: string) => {
  const groupToHeading = (groupKey: string) =>
    Match.value(groupKey).pipe(
      Match.when('Danger', () => ({
        content: ih.span([], ['Danger Zone']),
        className: headingClassName,
      })),
      Match.orElse(() => undefined),
    )

  return {
    anchor: MENU_ANCHOR,
    items: MENU_ITEMS,
    itemToConfig: (item: MenuItem) => ({
      className: itemClassName,
      content: ih.div(
        [ih.Class('flex items-center gap-2.5')],
        [menuItemIcon(item), ih.span([], [item])],
      ),
    }),
    isItemDisabled,
    buttonContent: ih.div(
      [ih.Class('flex items-center gap-4')],
      [ih.span([], ['Actions']), Icon.chevronDown('w-4 h-4')],
    ),
    buttonAttributes: childAttributes([ih.Class(triggerClassName)]),
    itemsAttributes: childAttributes([ih.Class(itemsClassName)]),
    backdropAttributes: childAttributes([ih.Class(backdropClassName)]),
    attributes: childAttributes([ih.Class(wrapperClassName)]),
    itemGroupKey,
    groupToHeading,
  }
}

export const basicDemo = (menuModel: Menu.Model, h: HtmlBuilder<Message>) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(Menu.buttonId(menuModel.id)), h.Class('demo-label')],
          ['Row actions'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.submodel({
              slotId: menuModel.id,
              model: menuModel,
              view: DemoMenu.view,
              viewInputs: {
                ...menuViewConfig(basicItemsClassName),
              },
              toParentMessage: message =>
                Message.GotMenuBasicDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

export const animatedDemo = (
  menuModel: Menu.Model,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(Menu.buttonId(menuModel.id)), h.Class('demo-label')],
          ['Row actions'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.submodel({
              slotId: menuModel.id,
              model: menuModel,
              view: DemoMenu.view,
              viewInputs: {
                ...menuViewConfig(animatedItemsClassName),
              },
              toParentMessage: message =>
                Message.GotMenuAnimatedDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}
