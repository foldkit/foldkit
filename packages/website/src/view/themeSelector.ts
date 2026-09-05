import { Match, Option } from 'effect'
import {
  type Html,
  type HtmlBuilder,
  childAttributes,
  inertHtml as ih,
} from 'foldkit/html'

import { Menu } from '@foldkit/ui'

import { Icon } from '../icon'
import { Message, type ThemePreference } from '../message'

const THEME_PREFERENCES: ReadonlyArray<ThemePreference> = [
  'Light',
  'System',
  'Dark',
]

const THEME_MENU_ANCHOR: Menu.AnchorConfig = {
  placement: 'bottom-end',
  gap: 8,
  padding: 8,
}

const triggerIconClassName = 'w-6 h-6'

export const ThemeMenu = Menu.create<ThemePreference>()

const preferenceIcon = (preference: ThemePreference, className: string): Html =>
  Match.value(preference).pipe(
    Match.when('Light', () => Icon.sun(className)),
    Match.when('System', () => Icon.computer(className)),
    Match.when('Dark', () => Icon.moon(className)),
    Match.exhaustive,
  )

export const view = (
  menu: Menu.Model,
  maybeActivePreference: Option.Option<ThemePreference>,
  h: HtmlBuilder<Message>,
): Html => {
  const activePreference: ThemePreference = Option.getOrElse(
    maybeActivePreference,
    () => 'System',
  )

  return h.submodel({
    slotId: 'theme-menu',
    model: menu,
    view: ThemeMenu.view,
    viewInputs: {
      anchor: THEME_MENU_ANCHOR,
      ariaLabel: `Theme: ${activePreference}`,
      items: THEME_PREFERENCES,
      itemToConfig: preference => {
        const isSelected = preference === activePreference

        return {
          className:
            'w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 data-[active]:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 dark:data-[active]:bg-gray-800',
          content: ih.div(
            [ih.Class('flex w-full items-center gap-3')],
            [
              preferenceIcon(preference, 'w-5 h-5 shrink-0'),
              ih.span([ih.Class('flex-1')], [preference]),
              Icon.check(
                isSelected
                  ? 'w-4 h-4 shrink-0 text-accent-600 dark:text-accent-400'
                  : 'invisible w-4 h-4 shrink-0',
              ),
              ...(isSelected
                ? [ih.span([ih.Class('sr-only')], ['(selected)'])]
                : []),
            ],
          ),
        }
      },
      buttonContent: preferenceIcon(activePreference, triggerIconClassName),
      buttonAttributes: childAttributes([
        ih.Class(
          'inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-gray-700 transition hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:outline-accent-400',
        ),
      ]),
      itemsAttributes: childAttributes([
        ih.Class(
          'z-[70] min-w-40 rounded-lg border border-gray-200 bg-cream p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900',
        ),
      ]),
      backdropAttributes: childAttributes([ih.Class('fixed inset-0 z-[60]')]),
      attributes: childAttributes([ih.Class('inline-flex')]),
    },
    toParentMessage: message => Message.GotThemeMenuMessage({ message }),
  })
}
