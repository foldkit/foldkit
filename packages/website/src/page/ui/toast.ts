import { Match as M, Option } from 'effect'
import type { Html } from 'foldkit/html'
import type { EntryHandlers, Variant } from 'foldkit/ui/toast'

import { Class, OnClick, button, div, p } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import {
  ClickedDismissAllToasts,
  ClickedShowErrorToast,
  ClickedShowInfoToast,
  ClickedShowStickyToast,
  ClickedShowSuccessToast,
  GotToastDemoMessage,
  type Message,
} from './message'
import { Toast } from './toastModule'

type Entry = typeof Toast.Entry.Type
type Model = typeof Toast.Model.Type

// DEMO CONTENT

const variantClassName = (variant: Variant): string =>
  M.value(variant).pipe(
    M.when(
      'Info',
      () =>
        'border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white',
    ),
    M.when(
      'Success',
      () =>
        'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
    ),
    M.when(
      'Warning',
      () =>
        'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
    ),
    M.when(
      'Error',
      () =>
        'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100',
    ),
    M.exhaustive,
  )

const entryClassName = 'w-80'

const buttonClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const renderToastEntry = (
  entry: Entry,
  handlers: EntryHandlers<ParentMessage>,
): Html =>
  div(
    [
      Class(
        `relative rounded-lg border shadow-sm p-3 pr-9 ${variantClassName(entry.variant)}`,
      ),
    ],
    [
      p([Class('font-semibold text-sm')], [entry.payload.title]),
      ...Option.match(entry.payload.maybeDescription, {
        onNone: () => [],
        onSome: description => [
          p([Class('text-sm opacity-80 mt-0.5')], [description]),
        ],
      }),
      button(
        [
          Class(
            'absolute top-2 right-2 opacity-60 hover:opacity-100 cursor-pointer rounded-md p-1 transition-opacity',
          ),
          OnClick(handlers.dismiss),
        ],
        [Icon.close('w-4 h-4')],
      ),
    ],
  )

// VIEW

export const demo = (
  toastModel: Model,
  toParentMessage: (message: Message) => ParentMessage,
): ReadonlyArray<Html> => [
  div(
    [Class('flex flex-wrap gap-2')],
    [
      button(
        [
          Class(buttonClassName),
          OnClick(toParentMessage(ClickedShowInfoToast())),
        ],
        ['Info'],
      ),
      button(
        [
          Class(buttonClassName),
          OnClick(toParentMessage(ClickedShowSuccessToast())),
        ],
        ['Success'],
      ),
      button(
        [
          Class(buttonClassName),
          OnClick(toParentMessage(ClickedShowErrorToast())),
        ],
        ['Error'],
      ),
      button(
        [
          Class(buttonClassName),
          OnClick(toParentMessage(ClickedShowStickyToast())),
        ],
        ['Sticky'],
      ),
      button(
        [
          Class(buttonClassName),
          OnClick(toParentMessage(ClickedDismissAllToasts())),
        ],
        ['Dismiss all'],
      ),
    ],
  ),
  Toast.view({
    model: toastModel,
    position: 'BottomRight',
    toParentMessage: message =>
      toParentMessage(GotToastDemoMessage({ message })),
    renderEntry: renderToastEntry,
    entryClassName,
  }),
]
