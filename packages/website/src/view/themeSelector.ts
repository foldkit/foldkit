import { clsx } from 'clsx'
import { Html, html } from 'foldkit/html'

import { Icon } from '../icon'
import {
  type Message,
  SelectedThemePreference,
  type ThemePreference,
} from '../message'

export const themeSelector = (activePreference: ThemePreference): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Role('group'),
      h.AriaLabel('Theme preference'),
      h.Class(
        'flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700',
      ),
    ],
    [
      themeSelectorButton(
        'Light',
        activePreference,
        Icon.sun('w-4 h-4'),
        'Light mode',
      ),
      themeSelectorButton(
        'System',
        activePreference,
        Icon.computer('w-4 h-4'),
        'System mode',
      ),
      themeSelectorButton(
        'Dark',
        activePreference,
        Icon.moon('w-4 h-4'),
        'Dark mode',
      ),
    ],
  )
}

const themeSelectorButton = (
  preference: ThemePreference,
  activePreference: ThemePreference,
  icon: Html,
  label: string,
) => {
  const h = html<Message>()

  const isActive = preference === activePreference

  return h.button(
    [
      h.AriaPressed(isActive.toString()),
      h.Class(
        clsx(
          'p-2 rounded-md transition cursor-pointer',
          isActive
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        ),
      ),
      h.AriaLabel(label),
      h.OnClick(SelectedThemePreference({ preference })),
    ],
    [icon],
  )
}
