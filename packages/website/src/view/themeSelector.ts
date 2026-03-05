import classNames from 'classnames'
import { Html } from 'foldkit/html'

import {
  AriaLabel,
  AriaPressed,
  Class,
  OnClick,
  Role,
  button,
  div,
} from '../html'
import { Icon } from '../icon'
import {
  SelectedThemePreference,
  type ThemePreference,
} from '../main'

export const themeSelector = (
  activePreference: ThemePreference,
): Html =>
  div(
    [
      Role('group'),
      AriaLabel('Theme preference'),
      Class(
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

const themeSelectorButton = (
  preference: ThemePreference,
  activePreference: ThemePreference,
  icon: Html,
  label: string,
) => {
  const isActive = preference === activePreference

  return button(
    [
      AriaPressed(isActive.toString()),
      Class(
        classNames(
          'p-2 rounded-md transition cursor-pointer',
          isActive
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        ),
      ),
      AriaLabel(label),
      OnClick(SelectedThemePreference({ preference })),
    ],
    [icon],
  )
}
